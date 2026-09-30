/**
 * AI Reply Post-Generation Validator
 *
 * Validates generated draft against the non-negotiable safety guardrails:
 * - Forbidden inventions (refunds, discounts, compensation, unauthorized promises)
 * - Hallucinations and system prompt leakage
 * - Text sanity and length boundaries
 */

import { FORBIDDEN_AI_INVENTIONS } from '../../../shared/constants/automation';

export interface ReplyValidationResult {
  isValid: boolean;
  violations: string[];
  sanitizedText: string;
}

export class ReplyValidator {
  validate(text: string): ReplyValidationResult {
    const violations: string[] = [];
    let sanitized = (text || '').trim();

    if (!sanitized || sanitized.length < 10) {
      violations.push('Reply text is too short or empty');
      return { isValid: false, violations, sanitizedText: sanitized };
    }

    if (sanitized.length > 1000) {
      violations.push('Reply text exceeds 1000 character maximum limit');
    }

    const lower = sanitized.toLowerCase();

    // Check forbidden business inventions
    for (const forbidden of FORBIDDEN_AI_INVENTIONS) {
      const normalized = forbidden.replace('actions not present in trusted context', 'guarantee');
      const stem = normalized.endsWith('ies')
        ? normalized.slice(0, -3) + '(y|ies)'
        : normalized.endsWith('s')
        ? normalized.slice(0, -1) + 's?'
        : normalized;
      const regex = new RegExp(`\\b${stem}\\b`, 'i');
      if (regex.test(lower)) {
        violations.push(`Contains forbidden AI invention: "${forbidden}"`);
      }
    }

    // Check system prompt leakage
    const promptLeakIndicators = [
      'as an ai',
      'system prompt',
      'untrusted_review_content',
      '<untrusted_review_content>',
      'ignore previous instructions',
      'i am a large language model',
    ];

    for (const leak of promptLeakIndicators) {
      if (lower.includes(leak)) {
        violations.push(`System instruction or prompt leakage detected: "${leak}"`);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      sanitizedText: sanitized,
    };
  }
}
