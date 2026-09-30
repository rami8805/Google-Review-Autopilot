import { DatabaseStore } from '../../server/services/data/dbStore';
import {
  BusinessService,
  BusinessLocationService,
} from '../../server/services/data/dataService';
import { InvalidOwnershipError } from '../../server/services/data/errors';
import { TenantGuard } from '../../server/services/data/tenantGuard';
import type { TenantContext } from '../../shared/types/database';

export function runInvalidOwnershipTests(): { passed: number; failed: number; results: string[] } {
  const store = new DatabaseStore();
  const businessService = new BusinessService(store);
  const locationService = new BusinessLocationService(store);

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

  const tenantOne = 'tenant_01';
  const tenantTwo = 'tenant_02';
  const contextOne: TenantContext = { saasCustomerId: tenantOne, role: 'OWNER' };

  // Business belonging to Tenant Two
  const foreignBusiness = businessService.create(
    { id: 'biz_foreign', saasCustomerId: tenantTwo, name: 'Foreign Practice' },
    { saasCustomerId: tenantTwo, role: 'OWNER' }
  );

  // 1. Attempting to create BusinessLocation for Tenant One with a non-existent businessId
  try {
    locationService.create(
      {
        id: 'loc_bad_1',
        businessId: 'non_existent_biz',
        saasCustomerId: tenantOne,
        googleLocationId: 'google_loc_bad_1',
        displayName: 'Invalid Location',
        locationName: 'Invalid Location',
        address: {
          addressLines: ['123 Fake St'],
          locality: 'SF',
          administrativeArea: 'CA',
          postalCode: '94101',
          country: 'US',
        },
        timezone: 'UTC',
        connectionStatus: 'CONNECTED',
        isConnected: true,
        automationEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      contextOne
    );
    assert(false, 'Should fail when referencing non-existent businessId');
  } catch (err) {
    assert(
      err instanceof InvalidOwnershipError,
      'Fails with InvalidOwnershipError when referencing non-existent business'
    );
  }

  // 2. Attempting to create BusinessLocation for Tenant One with businessId owned by Tenant Two
  try {
    locationService.create(
      {
        id: 'loc_bad_2',
        businessId: foreignBusiness.id,
        saasCustomerId: tenantOne,
        googleLocationId: 'google_loc_bad_2',
        displayName: 'Hijacked Location',
        locationName: 'Hijacked Location',
        address: {
          addressLines: ['123 Fake St'],
          locality: 'SF',
          administrativeArea: 'CA',
          postalCode: '94101',
          country: 'US',
        },
        timezone: 'UTC',
        connectionStatus: 'CONNECTED',
        isConnected: true,
        automationEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      contextOne
    );
    assert(false, 'Should fail when referencing foreign business owned by another tenant');
  } catch (err) {
    assert(
      err instanceof InvalidOwnershipError,
      'Fails with InvalidOwnershipError when referencing business belonging to another tenant'
    );
  }

  // 3. Resolving ownership on an entity without tenant links fails cleanly
  try {
    TenantGuard.resolveTenantOwnership('Review', { comment: 'No location attached' }, store);
    assert(false, 'Should fail resolving tenant for orphan review');
  } catch (err) {
    assert(
      err instanceof InvalidOwnershipError,
      'Fails with InvalidOwnershipError when entity lacks a path to SaaSCustomer'
    );
  }

  return { passed, failed, results };
}
