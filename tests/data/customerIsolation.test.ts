import { DatabaseStore } from '../../server/services/data/dbStore';
import {
  SaaSCustomerService,
  BusinessService,
  BusinessLocationService,
  ReviewService,
} from '../../server/services/data/dataService';
import { TenantMismatchError } from '../../server/services/data/errors';
import type { TenantContext } from '../../shared/types/database';

export async function runCustomerIsolationTests(): Promise<{ passed: number; failed: number; results: string[] }> {
  const store = new DatabaseStore();
  const customerService = new SaaSCustomerService(store);
  const businessService = new BusinessService(store);
  const locationService = new BusinessLocationService(store);
  const reviewService = new ReviewService(store);

  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      results.push(`PASS: ${testName}`);
    } else {
      failed++;
      results.push(`FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
    }
  }

  // Setup Tenant Alpha
  const tenantAlphaId = 'tenant_alpha';
  const contextAlpha: TenantContext = { saasCustomerId: tenantAlphaId, role: 'OWNER' };
  customerService.create(
    {
      id: tenantAlphaId,
      ownerUserId: 'user_alpha',
      businessName: 'Alpha Dental',
      contactName: 'Alice Alpha',
      email: 'alice@alpha.local',
      status: 'ACTIVE',
    },
    { isSuperAdmin: true, saasCustomerId: 'admin' }
  );

  const businessAlpha = businessService.create(
    {
      id: 'biz_alpha',
      saasCustomerId: tenantAlphaId,
      name: 'Alpha Dental Downtown',
      category: 'Dentist',
    },
    contextAlpha
  );

  const locationAlpha = locationService.create(
    {
      id: 'loc_alpha',
      businessId: businessAlpha.id,
      saasCustomerId: tenantAlphaId,
      googleLocationId: 'loc_alpha_google',
      displayName: 'Alpha Clinic',
      locationName: 'Alpha Clinic',
      address: {
        addressLines: ['1 Alpha Way'],
        locality: 'San Francisco',
        administrativeArea: 'CA',
        postalCode: '94101',
        country: 'US',
      },
      timezone: 'America/Los_Angeles',
      connectionStatus: 'CONNECTED',
      isConnected: true,
      automationEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    contextAlpha
  );

  // Setup Tenant Beta
  const tenantBetaId = 'tenant_beta';
  const contextBeta: TenantContext = { saasCustomerId: tenantBetaId, role: 'OWNER' };
  customerService.create(
    {
      id: tenantBetaId,
      ownerUserId: 'user_beta',
      businessName: 'Beta Chiropractic',
      contactName: 'Bob Beta',
      email: 'bob@beta.local',
      status: 'ACTIVE',
    },
    { isSuperAdmin: true, saasCustomerId: 'admin' }
  );

  // 1. Tenant Beta cannot get Tenant Alpha's customer record
  try {
    customerService.getById(tenantAlphaId, contextBeta);
    assert(false, 'Tenant Beta cannot read Tenant Alpha customer profile');
  } catch (err) {
    assert(err instanceof TenantMismatchError, 'Tenant Beta cannot read Tenant Alpha customer profile (throws TenantMismatchError)');
  }

  // 2. Tenant Beta cannot read Tenant Alpha's business
  try {
    businessService.getById(businessAlpha.id, contextBeta);
    assert(false, 'Tenant Beta cannot read Tenant Alpha business');
  } catch (err) {
    assert(err instanceof TenantMismatchError, 'Tenant Beta cannot read Tenant Alpha business (throws TenantMismatchError)');
  }

  // 3. Tenant Beta cannot read Tenant Alpha's business location
  try {
    locationService.getById(locationAlpha.id, contextBeta);
    assert(false, 'Tenant Beta cannot read Tenant Alpha location');
  } catch (err) {
    assert(err instanceof TenantMismatchError, 'Tenant Beta cannot read Tenant Alpha location (throws TenantMismatchError)');
  }

  // 4. Tenant Beta's listByTenant query contains zero items from Tenant Alpha
  const betaLocations = locationService.listByTenant(contextBeta);
  assert(
    betaLocations.length === 0,
    'Tenant Beta listByTenant returns only its own locations and zero cross-tenant items'
  );

  // 5. Tenant Beta cannot import a review for Tenant Alpha's location
  let reviewImportBlocked = false;
  try {
    await reviewService.importReviewIdempotent(
      {
        businessLocationId: locationAlpha.id,
        provider: 'GOOGLE',
        providerReviewId: 'review_tamper_01',
        rating: 5,
        authorName: 'Mallory',
        reviewCreatedAt: new Date().toISOString(),
      },
      contextBeta
    );
  } catch (err) {
    if (err instanceof TenantMismatchError) {
      reviewImportBlocked = true;
    }
  }
  assert(reviewImportBlocked, 'Tenant Beta is strictly prevented from importing reviews into Tenant Alpha location');

  return { passed, failed, results };
}
