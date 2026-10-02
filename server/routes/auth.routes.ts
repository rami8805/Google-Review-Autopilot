import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import {
  UserRepository,
  TenantRepository,
  GoogleConnectionRepository,
  AuditRepository,
} from '../repositories/postgresRepositories.ts';

const router = Router();
const userRepo = new UserRepository();
const tenantRepo = new TenantRepository();
const googleRepo = new GoogleConnectionRepository();
const auditRepo = new AuditRepository();

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const user = await userRepo.getById(auth.userId);
  const tenant = await tenantRepo.getById(auth.tenantId);
  const locations = await googleRepo.listLocations(auth.tenantId);

  res.json({
    success: true,
    data: {
      user: {
        ...(user || {}),
        id: auth.userId,
        email: auth.email,
        name: user?.name || (auth.email ? auth.email.split('@')[0] : 'User'),
        role: auth.role,
        saasCustomerId: auth.tenantId,
        emailVerified: true,
        createdAt: user?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      saasCustomer: tenant || {
        id: auth.tenantId,
        name: 'Platform Administration',
        billingEmail: auth.email,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      business: {
        id: `biz_${auth.tenantId}`,
        saasCustomerId: auth.tenantId,
        name: tenant?.name || 'Platform Administration',
        industryCategory: 'Platform Management',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      location: locations[0] || null,
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { businessName, email, category } = req.body || {};
  if (!businessName || !email) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Business name and account email are required.' },
    });
    return;
  }

  const tenantId = `saas_cust_${Date.now()}`;
  const userId = `usr_${Date.now()}`;

  const tenant = await tenantRepo.create({
    id: tenantId,
    name: businessName,
    billingEmail: email,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const user = await userRepo.create({
    id: userId,
    email,
    name: businessName,
    role: 'OWNER',
    saasCustomerId: tenantId,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await userRepo.createMembership(tenantId, userId, 'OWNER');

  const location = await googleRepo.upsertLocation(tenantId, {
    id: `loc_${Date.now()}`,
    businessId: `biz_${tenantId}`,
    saasCustomerId: tenantId,
    googleLocationId: `locations/${Date.now()}`,
    locationName: businessName,
    address: {
      addressLines: ['100 Main St'],
      locality: 'San Francisco',
      administrativeArea: 'CA',
      postalCode: '94105',
      country: 'US',
    },
    primaryCategory: category || 'Local Business',
    isConnected: false,
    automationEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await auditRepo.logEvent({
    id: `audit_${Date.now()}`,
    saasCustomerId: tenantId,
    actorType: 'USER',
    action: 'CUSTOMER_SIGNUP',
    targetResourceType: 'LOCATION',
    targetResourceId: location.id,
    details: { businessName, email },
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    data: {
      saasCustomerId: tenantId,
      userId: user.id,
      location,
      message: 'Account initialized. Please connect your Google Business Profile to continue.',
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

export default router;
