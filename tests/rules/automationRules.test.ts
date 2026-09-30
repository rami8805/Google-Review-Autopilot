/**
 * Automation Rule Evaluation Test Suite
 *
 * Verifies that the rule engine strictly satisfies the core contract:
 * - 5-star + LOW risk -> AUTO_PUBLISH
 * - 4-star + LOW risk -> AUTO_PUBLISH
 * - 3-star -> REQUIRE_APPROVAL
 * - 1-2-star -> REQUIRE_APPROVAL
 * - HIGH or CRITICAL risk -> REQUIRE_APPROVAL regardless of rating
 */

import { DEFAULT_AUTOMATION_RULES, RISK_LEVEL_SEVERITY } from '../../shared/constants/automation';
import type { RiskLevel, StarRating, ReplyDecisionAction } from '../../shared/types/domain';

export function evaluateDecision(starRating: StarRating, riskLevel: RiskLevel): ReplyDecisionAction {
  // HIGH or CRITICAL risk is ALWAYS locked to REQUIRE_APPROVAL
  if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    return 'REQUIRE_APPROVAL';
  }

  const matchingRule = DEFAULT_AUTOMATION_RULES.find((r) => r.starRating === starRating);
  if (!matchingRule || !matchingRule.isActive) {
    return 'REQUIRE_APPROVAL';
  }

  if (matchingRule.action === 'AUTO_PUBLISH') {
    const currentSeverity = RISK_LEVEL_SEVERITY[riskLevel];
    const maxAllowed = RISK_LEVEL_SEVERITY[matchingRule.maxRiskLevelForAutoPublish];
    if (currentSeverity <= maxAllowed) {
      return 'AUTO_PUBLISH';
    }
  }

  return 'REQUIRE_APPROVAL';
}

export function runAutomationRulesTests(): { passed: number; failed: number; results: string[] } {
  const tests: Array<{
    name: string;
    rating: StarRating;
    risk: RiskLevel;
    expected: ReplyDecisionAction;
  }> = [
    { name: '5-star + LOW risk -> AUTO_PUBLISH', rating: 5, risk: 'LOW', expected: 'AUTO_PUBLISH' },
    { name: '4-star + LOW risk -> AUTO_PUBLISH', rating: 4, risk: 'LOW', expected: 'AUTO_PUBLISH' },
    { name: '5-star + HIGH risk -> REQUIRE_APPROVAL', rating: 5, risk: 'HIGH', expected: 'REQUIRE_APPROVAL' },
    { name: '5-star + CRITICAL risk -> REQUIRE_APPROVAL', rating: 5, risk: 'CRITICAL', expected: 'REQUIRE_APPROVAL' },
    { name: '3-star + LOW risk -> REQUIRE_APPROVAL', rating: 3, risk: 'LOW', expected: 'REQUIRE_APPROVAL' },
    { name: '2-star + LOW risk -> REQUIRE_APPROVAL', rating: 2, risk: 'LOW', expected: 'REQUIRE_APPROVAL' },
    { name: '1-star + LOW risk -> REQUIRE_APPROVAL', rating: 1, risk: 'LOW', expected: 'REQUIRE_APPROVAL' },
    { name: '1-star + CRITICAL risk -> REQUIRE_APPROVAL', rating: 1, risk: 'CRITICAL', expected: 'REQUIRE_APPROVAL' },
  ];

  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  for (const t of tests) {
    const actual = evaluateDecision(t.rating, t.risk);
    if (actual === t.expected) {
      passed++;
      results.push(`PASS: ${t.name}`);
    } else {
      failed++;
      results.push(`FAIL: ${t.name} (expected ${t.expected}, got ${actual})`);
    }
  }

  return { passed, failed, results };
}
