import { runAutomationRulesTests } from './rules/automationRules.test';
import { runSafetyTests } from './safety/injectionDefense.test';
import { runAuthTests } from './auth/auth.test';
import { runBillingTests } from './billing/billing.test';

async function main() {
  console.log('====================================================');
  console.log(' RUNNING GOOGLE REVIEW AUTOPILOT VERIFICATION SUITES');
  console.log('====================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;

  // 1. Rules
  console.log('--- 1. Automation Rules Evaluation ---');
  const rules = runAutomationRulesTests();
  rules.results.forEach((r) => console.log(' ', r));
  totalPassed += rules.passed;
  totalFailed += rules.failed;
  console.log(`Summary: ${rules.passed} passed, ${rules.failed} failed\n`);

  // 2. Safety & Prompt Injection Defense
  console.log('--- 2. Safety & Untrusted Review Injection Defense ---');
  const safety = runSafetyTests();
  safety.results.forEach((r) => console.log(' ', r));
  totalPassed += safety.passed;
  totalFailed += safety.failed;
  console.log(`Summary: ${safety.passed} passed, ${safety.failed} failed\n`);

  // 3. Auth & RBAC & Tenant Isolation
  console.log('--- 3. SaaS Authentication, RBAC & Tenant Isolation ---');
  const auth = await runAuthTests();
  auth.results.forEach((r) => console.log(' ', r));
  totalPassed += auth.passed;
  totalFailed += auth.failed;
  console.log(`Summary: ${auth.passed} passed, ${auth.failed} failed\n`);

  // 4. Billing, Subscriptions, Webhooks, Idempotency & Limits
  console.log('--- 4. Billing, Subscriptions, Webhooks & Quotas ---');
  const billing = await runBillingTests();
  billing.results.forEach((r) => console.log(' ', r));
  totalPassed += billing.passed;
  totalFailed += billing.failed;
  console.log(`Summary: ${billing.passed} passed, ${billing.failed} failed\n`);

  console.log('====================================================');
  console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('====================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner encountered fatal error:', err);
  process.exit(1);
});
