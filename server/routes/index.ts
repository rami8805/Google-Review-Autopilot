import { Router, type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';

import authRoutes from './auth.routes.ts';
import googleRoutes from './google.routes.ts';
import reviewsRoutes from './reviews.routes.ts';
import settingsRoutes from './settings.routes.ts';
import billingRoutes from './billing.routes.ts';
import webhooksRoutes from './webhooks.routes.ts';
import tasksRoutes from './tasks.routes.ts';
import supportRoutes from './support.routes.ts';
import adminRoutes from './admin.routes.ts';

const router = Router();

// Structured logging & correlation ID middleware
router.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  res.setHeader('x-request-id', requestId);

  const startTime = Date.now();
  res.on('finish', () => {
    const latency = Date.now() - startTime;
    // Structured log without exposing sensitive headers or credentials
    if (process.env.NODE_ENV !== 'test') {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          latencyMs: latency,
        })
      );
    }
  });

  next();
});

// Domain route modules
router.use('/auth', authRoutes);
router.use('/google', googleRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/settings', settingsRoutes);
router.use('/billing', billingRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/tasks', tasksRoutes);
router.use('/support', supportRoutes);
router.use('/admin', adminRoutes);

export default router;
