import { runCustomerIsolationTests } from './customerIsolation.test';
import { runDuplicateReviewPreventionTests } from './duplicateReviewPrevention.test';
import { runInvalidOwnershipTests } from './invalidOwnership.test';
import { runUnauthorizedAccessTests } from './unauthorizedAccess.test';
import { runAdminAccessTests } from './adminAccess.test';
import { runSupportTicketOwnershipTests } from './supportTicketOwnership.test';

export async function runAllDataTests(): Promise<boolean> {
  console.log('====================================================');
  console.log(' Running Google Review Autopilot Data Architecture Tests');
  console.log('====================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;

  // 1. Customer Isolation
  console.log('[SUITE 1/6] Customer Isolation Tests');
  const suite1 = await runCustomerIsolationTests();
  suite1.results.forEach((r) => console.log('  ' + r));
  totalPassed += suite1.passed;
  totalFailed += suite1.failed;
  console.log(`  Summary: ${suite1.passed} passed, ${suite1.failed} failed\n`);

  // 2. Duplicate Review Prevention
  console.log('[SUITE 2/6] Duplicate Review Prevention Tests');
  const suite2 = await runDuplicateReviewPreventionTests();
  suite2.results.forEach((r) => console.log('  ' + r));
  totalPassed += suite2.passed;
  totalFailed += suite2.failed;
  console.log(`  Summary: ${suite2.passed} passed, ${suite2.failed} failed\n`);

  // 3. Invalid Ownership
  console.log('[SUITE 3/6] Invalid Ownership Tests');
  const suite3 = runInvalidOwnershipTests();
  suite3.results.forEach((r) => console.log('  ' + r));
  totalPassed += suite3.passed;
  totalFailed += suite3.failed;
  console.log(`  Summary: ${suite3.passed} passed, ${suite3.failed} failed\n`);

  // 4. Unauthorized Access
  console.log('[SUITE 4/6] Unauthorized Access Tests');
  const suite4 = runUnauthorizedAccessTests();
  suite4.results.forEach((r) => console.log('  ' + r));
  totalPassed += suite4.passed;
  totalFailed += suite4.failed;
  console.log(`  Summary: ${suite4.passed} passed, ${suite4.failed} failed\n`);

  // 5. Admin Access
  console.log('[SUITE 5/6] Admin Access Tests');
  const suite5 = runAdminAccessTests();
  suite5.results.forEach((r) => console.log('  ' + r));
  totalPassed += suite5.passed;
  totalFailed += suite5.failed;
  console.log(`  Summary: ${suite5.passed} passed, ${suite5.failed} failed\n`);

  // 6. Support Ticket Ownership
  console.log('[SUITE 6/6] Support Ticket Ownership Tests');
  const suite6 = runSupportTicketOwnershipTests();
  suite6.results.forEach((r) => console.log('  ' + r));
  totalPassed += suite6.passed;
  totalFailed += suite6.failed;
  console.log(`  Summary: ${suite6.passed} passed, ${suite6.failed} failed\n`);

  console.log('====================================================');
  console.log(` TOTAL DATA ARCHITECTURE RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('====================================================');

  if (totalFailed > 0) {
    console.error('Data architecture tests failed!');
    process.exit(1);
  }

  return true;
}

// Run immediately if executed directly via tsx
runAllDataTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
