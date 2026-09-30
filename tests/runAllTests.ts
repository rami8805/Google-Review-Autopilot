import { runAutomationRulesTests } from './rules/automationRules.test';
import { runSafetyTests } from './safety/injectionDefense.test';
import { runSupportSecurityTests } from './support/supportSecurity.test';
import { runCustomerManagementTests } from './admin/adminCustomerManagement.test';

async function runAll() {
  console.log('==================================================');
  console.log('🧪 RUNNING GOOGLE REVIEW AUTOPILOT TEST SUITES');
  console.log('==================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;

  // 1. Automation Rules
  console.log('--- 1. Automation Rules Evaluation ---');
  const rules = runAutomationRulesTests();
  rules.results.forEach((r) => console.log('  ', r));
  totalPassed += rules.passed;
  totalFailed += rules.failed;
  console.log(`Summary: ${rules.passed} passed, ${rules.failed} failed\n`);

  // 2. Injection Defense & AI Constraints
  console.log('--- 2. Safety & Untrusted Injection Defense ---');
  const safety = runSafetyTests();
  safety.results.forEach((r) => console.log('  ', r));
  totalPassed += safety.passed;
  totalFailed += safety.failed;
  console.log(`Summary: ${safety.passed} passed, ${safety.failed} failed\n`);

  // 3. Customer Management & Metrics
  console.log('--- 3. Customer Management & Platform Admin Metrics ---');
  const custMgmt = runCustomerManagementTests();
  custMgmt.results.forEach((r) => console.log('  ', r));
  totalPassed += custMgmt.passed;
  totalFailed += custMgmt.failed;
  console.log(`Summary: ${custMgmt.passed} passed, ${custMgmt.failed} failed\n`);

  // 4. Support Security, Isolation, & Lifecycle
  console.log('--- 4. Support Security, Isolation, & Notifications ---');
  const support = await runSupportSecurityTests();
  support.results.forEach((r) => console.log('  ', r));
  totalPassed += support.passed;
  totalFailed += support.failed;
  console.log(`Summary: ${support.passed} passed, ${support.failed} failed\n`);

  console.log('==================================================');
  console.log(`FINAL RESULT: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log('==================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
