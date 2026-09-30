import { Router } from 'express';
import { requireAuth, requireTenant, type AuthenticatedRequest } from '../middleware/auth.ts';
import { PaddleBillingService } from '../services/billing/paddleService.ts';
import { BillingRepository, AuditRepository } from '../repositories/postgresRepositories.ts';

const router = Router();
const paddleService = new PaddleBillingService();
const billingRepo = new BillingRepository();
const auditRepo = new AuditRepository();

router.use(requireAuth);
router.use(requireTenant);

// GET /api/billing/subscription
router.get('/subscription', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const subscription = (await billingRepo.getSubscription(tenantId)) || {
    id: `sub_${tenantId}`,
    saasCustomerId: tenantId,
    plan: 'STARTER' as const,
    status: 'TRIALING' as const,
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 14 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    locationLimit: 1,
    monthlyReplyLimit: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.json({ success: true, data: subscription });
});

// POST /api/billing/create-checkout
router.post('/create-checkout', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const { priceId, returnUrl } = req.body;

  if (!priceId) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'priceId is required for Paddle checkout' },
    });
    return;
  }

  const transaction = await paddleService.createTransaction({
    tenantId,
    customerEmail: req.auth!.email,
    priceId,
    returnUrl,
  });

  await auditRepo.logEvent({
    id: `audit_${Date.now()}`,
    saasCustomerId: tenantId,
    actorUserId: req.auth!.userId,
    actorType: 'USER',
    action: 'INITIATE_PADDLE_CHECKOUT',
    targetResourceType: 'SUBSCRIPTION',
    targetResourceId: transaction.transactionId,
    details: { priceId },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: transaction });
});

export default router;
