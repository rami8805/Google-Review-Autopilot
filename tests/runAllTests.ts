/**
 * Master Test Runner for Google Review Autopilot
 */

import { runAutomationRulesTests } from './rules/automationRules.test';
import { runSafetyTests } from './safety/injectionDefense.test';
import { runWorkflowTests } from './workflow/reviewWorkflow.test';

async function main() {
  console.log('====================================================');
  console.log('RUNNING GOOGLE REVIEW AUTOPILOT TEST SUITES');
  console.log('====================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;

  // 1. Rules Tests
  console.log('▶ Running Baseline Automation Rules Tests...');
  const rulesResult = runAutomationRulesTests();
  for (const r of rulesResult.results) {
    console.log(`  ${r}`);
  }
  totalPassed += rulesResult.passed;
  totalFailed += rulesResult.failed;
  console.log(`  Summary: ${rulesResult.passed} passed, ${rulesResult.failed} failed\n`);

  // 2. Safety Tests
  console.log('▶ Running AI Safety & Injection Defense Tests...');
  const safetyResult = runSafetyTests();
  for (const r of safetyResult.results) {
    console.log(`  ${r}`);
  }
  totalPassed += safetyResult.passed;
  totalFailed += safetyResult.failed;
  console.log(`  Summary: ${safetyResult.passed} passed, ${safetyResult.failed} failed\n`);

  // 3. Workflow Integration Tests
  console.log('▶ Running Workflow & Automation Integration Tests...');
  const workflowResult = await runWorkflowTests();
  for (const r of workflowResult.results) {
    console.log(`  ${r}`);
  }
  totalPassed += workflowResult.passed;
  totalFailed += workflowResult.failed;
  console.log(`  Summary: ${workflowResult.passed} passed, ${workflowResult.failed} failed\n`);

  console.log('====================================================');
  console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('====================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
