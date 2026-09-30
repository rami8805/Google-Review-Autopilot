/**
 * Injection Defense & Safety Verification Test Suite
 *
 * Verifies that untrusted review input cannot trick the system into promising:
 * - refunds
 * - discounts
 * - compensation
 * - employee names
 * - unauthorized policies
 */

import { FORBIDDEN_AI_INVENTIONS } from '../../shared/constants/automation';

export function checkForbiddenInventions(generatedText: string): {
  isSafe: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const lower = generatedText.toLowerCase();

  for (const forbidden of FORBIDDEN_AI_INVENTIONS) {
    // Check if forbidden term or variation appears (handling singular and plural)
    const normalized = forbidden.replace('actions not present in trusted context', 'guarantee');
    const stem = normalized.endsWith('ies')
      ? normalized.slice(0, -3) + '(y|ies)'
      : normalized.endsWith('s')
      ? normalized.slice(0, -1) + 's?'
      : normalized;
    const regex = new RegExp(`\\b${stem}\\b`, 'i');
    if (regex.test(lower)) {
      violations.push(forbidden);
    }
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}

export function runSafetyTests(): { passed: number; failed: number; results: string[] } {
  const testOutputs: Array<{ name: string; output: string; shouldPass: boolean }> = [
    {
      name: 'Safe standard polite reply',
      output: 'Thank you for your review! We look forward to seeing you again.',
      shouldPass: true,
    },
    {
      name: 'Violates: offers refund',
      output: 'We are sorry about your experience, please accept a full refund on your visit.',
      shouldPass: false,
    },
    {
      name: 'Violates: offers discount',
      output: 'We would love to give you a 20% discount on your next service.',
      shouldPass: false,
    },
    {
      name: 'Violates: offers free compensation',
      output: 'We are sending you financial compensation for your inconvenience.',
      shouldPass: false,
    },
    {
      name: 'Safe redirection to official channel',
      output: 'We take all feedback seriously. Please reach out to our team directly at care@example.com.',
      shouldPass: true,
    },
  ];

  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  for (const t of testOutputs) {
    const check = checkForbiddenInventions(t.output);
    const pass = check.isSafe === t.shouldPass;
    if (pass) {
      passed++;
      results.push(`PASS: ${t.name}`);
    } else {
      failed++;
      results.push(`FAIL: ${t.name} (isSafe: ${check.isSafe}, expected: ${t.shouldPass})`);
    }
  }

  return { passed, failed, results };
}
