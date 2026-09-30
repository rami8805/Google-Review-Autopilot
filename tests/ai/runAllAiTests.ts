import { runAllAiEngineTests } from './aiEngine.test';

async function main() {
  console.log('=====================================================');
  console.log('  RUNNING GEMINI AI ENGINE & SAFETY TEST SUITE');
  console.log('=====================================================\n');

  const summary = await runAllAiEngineTests();

  for (const res of summary.results) {
    const symbol = res.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${symbol} - ${res.name}`);
    if (!res.passed && res.details) {
      console.log(`     Error details: ${res.details}`);
    }
  }

  console.log('\n=====================================================');
  console.log(`TOTAL: ${summary.total} | PASSED: ${summary.passed} | FAILED: ${summary.failed}`);
  console.log('=====================================================');

  if (summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test run failed with unhandled exception:', err);
  process.exit(1);
});
