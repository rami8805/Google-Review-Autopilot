import { DatabaseStore } from '../../server/services/data/dbStore';
import {
  SaaSCustomerService,
  SubscriptionService,
} from '../../server/services/data/dataService';
import { TenantGuard } from '../../server/services/data/tenantGuard';
import { ForbiddenError } from '../../server/services/data/errors';
import type { TenantContext } from '../../shared/types/database';

export function runAdminAccessTests(): { passed: number; failed: number; results: string[] } {
  const store = new DatabaseStore();
  const customerService = new SaaSCustomerService(store);
  const subscriptionService = new SubscriptionService(store);

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

  const superAdminContext: TenantContext = {
    saasCustomerId: 'admin_sys',
    role: 'SUPER_ADMIN',
    isSuperAdmin: true,
  };

  const tenantOwnerContext: TenantContext = {
    saasCustomerId: 'tenant_client_01',
    role: 'OWNER',
  };

  // Seed two distinct customer tenants
  customerService.create(
    {
      id: 'cust_001',
      ownerUserId: 'user_001',
      businessName: 'Business One',
      contactName: 'One Contact',
      email: 'one@example.com',
      status: 'ACTIVE',
    },
    superAdminContext
  );

  customerService.create(
    {
      id: 'cust_002',
      ownerUserId: 'user_002',
      businessName: 'Business Two',
      contactName: 'Two Contact',
      email: 'two@example.com',
      status: 'ACTIVE',
    },
    superAdminContext
  );

  subscriptionService.upsert({
    id: 'sub_active_1',
    saasCustomerId: 'cust_001',
    plan: 'PRO',
    status: 'ACTIVE',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date().toISOString(),
    cancelAtPeriodEnd: false,
  });

  subscriptionService.upsert({
    id: 'sub_past_due_1',
    saasCustomerId: 'cust_002',
    plan: 'STARTER',
    status: 'PAST_DUE',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date().toISOString(),
    cancelAtPeriodEnd: false,
  });

  // 1. Non-admin attempting to list all SaaSCustomers throws ForbiddenError
  try {
    customerService.listAll(tenantOwnerContext);
    assert(false, 'Non-super-admin should not be able to call listAll on SaaSCustomers');
  } catch (err) {
    assert(err instanceof ForbiddenError, 'Non-super-admin receives ForbiddenError for listAll customers');
  }

  // 2. Super admin CAN list all SaaSCustomers
  const allCustomers = customerService.listAll(superAdminContext);
  assert(allCustomers.length === 2, 'SUPER_ADMIN successfully lists all customer tenants');

  // 3. Non-admin listing subscriptions by status throws ForbiddenError
  try {
    subscriptionService.listByStatus('ACTIVE', tenantOwnerContext);
    assert(false, 'Non-super-admin should not be able to list platform subscriptions by status');
  } catch (err) {
    assert(err instanceof ForbiddenError, 'Non-super-admin receives ForbiddenError for listByStatus subscriptions');
  }

  // 4. Super admin CAN list platform subscriptions by status using status index
  const activeSubs = subscriptionService.listByStatus('ACTIVE', superAdminContext);
  assert(activeSubs.length === 1 && activeSubs[0].id === 'sub_active_1', 'SUPER_ADMIN queries subscriptions by status index');

  // 5. TenantGuard admin-only check passes for SUPER_ADMIN
  let guardPassed = false;
  try {
    TenantGuard.assertAdminAccess(superAdminContext, 'telemetry export');
    guardPassed = true;
  } catch {
    guardPassed = false;
  }
  assert(guardPassed, 'TenantGuard.assertAdminAccess passes for SUPER_ADMIN');

  return { passed, failed, results };
}
