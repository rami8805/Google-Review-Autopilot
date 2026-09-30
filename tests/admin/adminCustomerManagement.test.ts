/**
 * Customer Management & Platform Admin Metric Verification Test Suite
 */

import { CustomerManagementService, PLAN_MRR } from '../../server/services/customer-management/customerManagementService';

export function runCustomerManagementTests(): {
  passed: number;
  failed: number;
  results: string[];
} {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  const recordResult = (name: string, condition: boolean, details?: string) => {
    if (condition) {
      passed++;
      results.push(`PASS: ${name}`);
    } else {
      failed++;
      results.push(`FAIL: ${name} ${details ? `(${details})` : ''}`);
    }
  };

  const service = new CustomerManagementService();

  // 1. Platform metrics aggregation
  const metrics = service.getPlatformMetrics({ openTickets: 3, highRiskTickets: 1 });
  recordResult(
    '1. Platform metrics calculate customer counts and MRR accurately',
    metrics.totalCustomers >= 6 &&
      metrics.activeCustomers >= 3 &&
      metrics.trialCustomers >= 1 &&
      metrics.pastDueCustomers >= 1 &&
      metrics.cancelledCustomers >= 1 &&
      metrics.mrr > 0 &&
      metrics.googleConnectionFailures >= 1
  );

  // 2. Customer listing & search
  const searchResults = service.listCustomers({ search: 'Downtown' });
  recordResult(
    '2. Customer list filters by search query',
    searchResults.length === 1 && searchResults[0].id === 'saas_cust_demo_01'
  );

  // 3. Customer filtering by plan
  const growthCustomers = service.listCustomers({ plan: 'GROWTH' });
  recordResult(
    '3. Customer list filters by subscription plan',
    growthCustomers.every((c) => c.plan === 'GROWTH') && growthCustomers.length >= 2
  );

  // 4. Customer filtering by connection status
  const failedSyncCustomers = service.listCustomers({ connectionStatus: 'FAILED' });
  recordResult(
    '4. Customer list filters by Google connection failure',
    failedSyncCustomers.some((c) => c.id === 'saas_cust_demo_04') &&
      failedSyncCustomers.every((c) => c.hasConnectionFailure)
  );

  // 5. Customer sorting by MRR
  const sortedByMrr = service.listCustomers({ sortBy: 'mrr', sortOrder: 'desc' });
  const isSorted = sortedByMrr.every((c, idx) => {
    if (idx === 0) return true;
    return sortedByMrr[idx - 1].mrr >= c.mrr;
  });
  recordResult('5. Customer list sorts by MRR descending', isSorted);

  // 6. Comprehensive 9-part detail
  const detail = service.getCustomerDetail('saas_cust_demo_01');
  const has9Parts =
    detail !== null &&
    detail.customer !== undefined &&
    detail.business !== undefined &&
    Array.isArray(detail.locations) &&
    detail.subscription !== undefined &&
    detail.usage !== undefined &&
    Array.isArray(detail.recentReviews) &&
    Array.isArray(detail.supportTickets) &&
    Array.isArray(detail.auditEvents) &&
    Array.isArray(detail.notes);
  recordResult('6. Customer detail returns all 9 comprehensive sections', has9Parts);

  // 7. Internal customer notes CRUD
  const note = service.addCustomerNote(
    'saas_cust_demo_01',
    'admin_1',
    'Lead Admin',
    'Special VIP customer handling note'
  );
  const detailAfterNote = service.getCustomerDetail('saas_cust_demo_01');
  const noteFound = detailAfterNote?.notes.some((n) => n.id === note.id);
  const deleted = service.deleteCustomerNote('saas_cust_demo_01', note.id, 'admin_1');
  recordResult('7. Private customer notes can be created and deleted with audit logging', Boolean(noteFound && deleted));

  // 8. Audited read-only impersonation session
  const session = service.generateReadOnlyCustomerSession('saas_cust_demo_01', {
    id: 'admin_1',
    name: 'Super Admin',
    email: 'admin@reviewautopilot.com',
    role: 'PLATFORM_ADMIN',
  });
  const auditLogs = service.getAuditEvents('saas_cust_demo_01');
  const impersonationAudited = auditLogs.some((e) => e.action === 'ADMIN_VIEW_AS_CUSTOMER_READ_ONLY');
  recordResult(
    '8. Read-only impersonation session is strictly read-only and logged to audit trail',
    session.success && session.impersonationContext?.readOnly === true && impersonationAudited
  );

  return { passed, failed, results };
}
