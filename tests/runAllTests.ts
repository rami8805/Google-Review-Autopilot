import { runAutomationRulesTests } from './rules/automationRules.test';
import { runSafetyTests } from './safety/injectionDefense.test';

console.log('--- RUNNING AUTOMATION RULE ENGINE TESTS ---');
const ruleResults = runAutomationRulesTests();
ruleResults.results.forEach((r) => console.log(r));
console.log(`Summary: ${ruleResults.passed} passed, ${ruleResults.failed} failed.\n`);

console.log('--- RUNNING AI INJECTION DEFENSE & SAFETY TESTS ---');
const safetyResults = runSafetyTests();
safetyResults.results.forEach((r) => console.log(r));
console.log(`Summary: ${safetyResults.passed} passed, ${safetyResults.failed} failed.\n`);

if (ruleResults.failed > 0 || safetyResults.failed > 0) {
  console.error('TEST SUITE FAILED!');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED SUCCESSFULLY (13/13).');
  process.exit(0);
}
