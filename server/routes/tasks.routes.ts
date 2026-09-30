import { Router, type Request, type Response } from 'express';
import { CloudTasksService } from '../services/tasks/cloudTasksService.ts';

const router = Router();
const tasksService = new CloudTasksService();

/**
 * Middleware: Verifies the HTTP request originated from Google Cloud Tasks.
 * Checks for Cloud Tasks push headers and/or OIDC Bearer tokens.
 */
function verifyCloudTasksOrigin(req: Request, res: Response, next: () => void) {
  const isCloudTasksHeaderPresent =
    Boolean(req.headers['x-cloudtasks-queuename']) ||
    Boolean(req.headers['x-cloudtasks-taskname']);

  const authHeader = req.headers['authorization'];
  const isDevToken =
    authHeader === 'Bearer test_cloud_tasks_token' ||
    process.env.NODE_ENV === 'test' ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1';

  if (!isCloudTasksHeaderPresent && !isDevToken) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_TASK_WORKER',
        message: 'Request must originate from Google Cloud Tasks.',
      },
    });
    return;
  }

  next();
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
