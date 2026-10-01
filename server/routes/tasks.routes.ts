import { Router, type Request, type Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { CloudTasksService } from '../services/tasks/cloudTasksService.ts';

const router = Router();
const tasksService = new CloudTasksService();
const authClient = new OAuth2Client();

/**
 * Middleware: Cryptographically verifies that the HTTP request originated from Google Cloud Tasks.
 * Validates Google OIDC ID tokens (JWT) passed in the Authorization header.
 * Raw header-based spoofing (e.g. x-cloudtasks-queuename) is strictly rejected in production.
 */
async function verifyCloudTasksOrigin(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers['authorization'] || '';
  const isTestOrLocal =
    process.env.NODE_ENV === 'test' ||
    (process.env.NODE_ENV !== 'production' && (req.ip === '127.0.0.1' || req.ip === '::1'));

  // Test suite / local dev token support
  if (isTestOrLocal && (authHeader === 'Bearer test_cloud_tasks_token' || process.env.NODE_ENV === 'test')) {
    next();
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_TASK_WORKER',
        message: 'Request must contain a valid Google OIDC Bearer token.',
      },
    });
    return;
  }

  const idToken = authHeader.substring(7).trim();

  try {
    const expectedAudience =
      process.env.CLOUD_TASKS_WORKER_URL ||
      process.env.APP_BASE_URL ||
      undefined;

    const ticket = await authClient.verifyIdToken({
      idToken,
      audience: expectedAudience,
    });

    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
      res.status(401).json({
        success: false,
        error: { code: 'UNVERIFIED_OIDC_TOKEN', message: 'Google OIDC token email is unverified.' },
      });
      return;
    }

    const expectedServiceAccount = process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;
    if (expectedServiceAccount && payload.email !== expectedServiceAccount) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_SERVICE_ACCOUNT',
          message: 'OIDC token service account does not match configured Cloud Tasks worker.',
        },
      });
      return;
    }

    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_OIDC_TOKEN',
        message: err?.message || 'Google OIDC token verification failed.',
      },
    });
  }
}

router.use(verifyCloudTasksOrigin);

/**
 * Common handler for processing Cloud Tasks jobs.
 */
async function handleTaskExecution(req: Request, res: Response) {
  const { jobId, correlationId } = req.body || {};

  if (!jobId) {
    res.status(400).json({ success: false, error: 'jobId is required' });
    return;
  }

  const result = await tasksService.executeJob(jobId, correlationId);

  // If permanent error, return 200 so Cloud Tasks does not uselessly retry
  if (result.isPermanentError) {
    res.status(200).json({
      success: false,
      status: 'PERMANENT_ERROR_ABORTED',
      error: result.error,
    });
    return;
  }

  // If transient failure, return 500 so Cloud Tasks triggers retry
  if (!result.success && result.status !== 'ALREADY_COMPLETED') {
    res.status(500).json(result);
    return;
  }

  res.status(200).json(result);
}

// Dedicated queue worker endpoints
router.post('/worker', handleTaskExecution);
router.post('/review-sync', handleTaskExecution);
router.post('/reply-publication', handleTaskExecution);
router.post('/notifications', handleTaskExecution);

export default router;
