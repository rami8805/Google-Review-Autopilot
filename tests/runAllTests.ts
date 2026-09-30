import { runAutomationRulesTests } from './rules/automationRules.test';
import { runSafetyTests } from './safety/injectionDefense.test';
import { runIntegrationTests } from './integration/endToEndJourney.test';
import { runReplyGuardTests } from './guard/replyGuard.test';
import { runProductionTests } from './production/productionJourney.test';
import { runPostgresPersistenceTests } from './db/postgresPersistence.test';
import { initTestDatabase } from './testDbHarness';

async function main() {
  console.log('--- INITIALIZING POSTGRESQL TEST DATABASE HARNESS ---');
  initTestDatabase();
  console.log('PostgreSQL schema, tables, constraints, and indexes loaded.\n');

  console.log('--- RUNNING POSTGRESQL PERSISTENCE & DATA ARCHITECTURE TESTS ---');
  const persistenceResults = await runPostgresPersistenceTests();
  persistenceResults.results.forEach((r) => console.log(r));
  console.log(`Summary: ${persistenceResults.passed} passed, ${persistenceResults.failed} failed.\n`);

  console.log('--- RUNNING AUTOMATION RULE ENGINE TESTS ---');
  const ruleResults = runAutomationRulesTests();
  ruleResults.results.forEach((r) => console.log(r));
  console.log(`Summary: ${ruleResults.passed} passed, ${ruleResults.failed} failed.\n`);

  console.log('--- RUNNING AI INJECTION DEFENSE & SAFETY TESTS ---');
  const safetyResults = runSafetyTests();
  safetyResults.results.forEach((r) => console.log(r));
  console.log(`Summary: ${safetyResults.passed} passed, ${safetyResults.failed} failed.\n`);

  console.log('--- RUNNING END-TO-END INTEGRATION & INVARIANT TESTS ---');
  const integrationResults = await runIntegrationTests();
  integrationResults.results.forEach((r) => console.log(r));
  console.log(`Summary: ${integrationResults.passed} passed, ${integrationResults.failed} failed.\n`);

  console.log('--- RUNNING REPLY GUARD SAFETY LAYER TESTS ---');
  const guardResults = await runReplyGuardTests();
  guardResults.results.forEach((r) => console.log(r));
  console.log(`Summary: ${guardResults.passed} passed, ${guardResults.failed} failed.\n`);

  console.log('--- RUNNING PRODUCTION ARCHITECTURE, AUTH, TENANT & PADDLE TESTS ---');
  const productionResults = await runProductionTests();
  productionResults.results.forEach((r) => console.log(r));
  console.log(`Summary: ${productionResults.passed} passed, ${productionResults.failed} failed.\n`);

  const totalPassed =
    persistenceResults.passed +
    ruleResults.passed +
    safetyResults.passed +
    integrationResults.passed +
    guardResults.passed +
    productionResults.passed;
  const totalFailed =
    persistenceResults.failed +
    ruleResults.failed +
    safetyResults.failed +
    integrationResults.failed +
    guardResults.failed +
    productionResults.failed;
  const totalTests = totalPassed + totalFailed;

  if (totalFailed > 0) {
    console.error(`TEST SUITE FAILED! (${totalFailed} failed)`);
    process.exit(1);
  } else {
    console.log(`ALL TESTS PASSED SUCCESSFULLY (${totalPassed}/${totalTests}).`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
