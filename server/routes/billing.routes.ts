import { Router } from 'express';
import { requireAuth, requireTenant, type AuthenticatedRequest } from '../middleware/auth.ts';
import { PaddleBillingService } from '../services/billing/paddleService.ts';
import { BillingRepository, AuditRepository } from '../repositories/postgresRepositories.ts';

const router = Router();
const paddleService = new PaddleBillingService();
const billingRepo = new BillingRepository();
const auditRepo = new AuditRepository();

export const PADDLE_PLAN_PRICE_MAP: Record<string, string> = {
  STARTER: process.env.PADDLE_PRICE_STARTER_MONTHLY || 'pri_sandbox_starter_01',
  GROWTH: process.env.PADDLE_PRICE_GROWTH_MONTHLY || 'pri_sandbox_growth_01',
  PRO: process.env.PADDLE_PRICE_PRO_MONTHLY || 'pri_sandbox_pro_01',
  BUSINESS: process.env.PADDLE_PRICE_BUSINESS_MONTHLY || 'pri_sandbox_business_01',
};

router.use(requireAuth);
router.use(requireTenant);

// GET /api/billing/pricing
router.get('/pricing', async (_req, res) => {
  res.json({
    success: true,
    data: {
      plans: {
        STARTER: { priceId: PADDLE_PLAN_PRICE_MAP.STARTER, locations: 1, replyLimit: 50 },
        GROWTH: { priceId: PADDLE_PLAN_PRICE_MAP.GROWTH, locations: 3, replyLimit: 200 },
        PRO: { priceId: PADDLE_PLAN_PRICE_MAP.PRO, locations: 10, replyLimit: 'UNLIMITED' },
      },
      clientToken: process.env.VITE_PADDLE_CLIENT_TOKEN || null,
      environment: process.env.PADDLE_ENV || 'sandbox',
    },
  });
});

// GET /api/billing/subscription
router.get('/subscription', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const subscription = await billingRepo.getSubscription(tenantId);
  if (!subscription) {
    res.status(404).json({
      success: false,
      error: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'No verified subscription exists for this tenant.' },
    });
    return;
  }

  res.json({ success: true, data: subscription });
});

// POST /api/billing/create-checkout
router.post('/create-checkout', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const { plan, priceId: rawPriceId, returnUrl } = req.body;

  // The backend determines the allowed plan and price ID — never trust client price amounts
  let priceId = rawPriceId;
  if (plan && PADDLE_PLAN_PRICE_MAP[plan.toUpperCase()]) {
    priceId = PADDLE_PLAN_PRICE_MAP[plan.toUpperCase()];
  }

  const validPriceIds = Object.values(PADDLE_PLAN_PRICE_MAP);
  if (!priceId || !validPriceIds.includes(priceId)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PLAN',
        message: 'Invalid plan requested. Backend must determine allowed plan and price ID.',
      },
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
    details: { priceId, plan },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: transaction });
});

export default router;
