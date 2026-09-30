import { Router, type Request, type Response } from 'express';
import { PaddleBillingService } from '../services/billing/paddleService.ts';

const router = Router();
const paddleService = new PaddleBillingService();

/**
 * POST /api/webhooks/paddle
 * Receives Paddle webhook events, verifies HMAC-SHA256 signature, enforces idempotency.
 */
router.post('/paddle', async (req: Request, res: Response) => {
  const signature = req.headers['paddle-signature'] as string;

  if (!signature) {
    res.status(401).json({
      success: false,
      error: { code: 'MISSING_SIGNATURE', message: 'Paddle-Signature header missing' },
    });
    return;
  }

  // Handle raw body string or JSON stringified body
  const rawBody = typeof req.body === 'string'
    ? req.body
    : Buffer.isBuffer(req.body)
    ? req.body.toString('utf-8')
    : JSON.stringify(req.body);

  const result = await paddleService.processWebhookEvent(rawBody, signature);

  if (!result.success) {
    if (result.error === 'INVALID_SIGNATURE') {
      res.status(401).json({ success: false, error: 'INVALID_SIGNATURE' });
      return;
    }
    // Return 400 for malformed payload
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  // Successfully processed or duplicate acknowledged
  res.status(200).json({
    success: true,
    eventType: result.eventType,
    status: 'ACCEPTED',
  });
});

export default router;
