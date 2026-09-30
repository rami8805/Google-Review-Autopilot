/**
 * Automation Rule Evaluation Engine
 *
 * Implements deterministic decision-making across all automation modes:
 * - SAFE
 * - BALANCED (default)
 * - FULL
 *
 * Invariants:
 * - When paused: NO automatic publishing occurs (reviews sync, AI drafts, but decision is REQUIRE_APPROVAL).
 * - Sensitive reviews: ALWAYS REQUIRE_APPROVAL.
 * - HIGH or CRITICAL risk: ALWAYS REQUIRE_APPROVAL.
 * - 1-2 star reviews: ALWAYS REQUIRE_APPROVAL.
 * - 3-star reviews: REQUIRE_APPROVAL by default.
 */

import type {
  StarRating,
  RiskAssessment,
  ReplyDecisionAction,
  AutomationRule,
} from '../../../shared/types/domain';
import { RISK_LEVEL_SEVERITY } from '../../../shared/constants/automation';
import type { AutomationMode } from './types';

export interface DecisionEvaluationResult {
  decision: ReplyDecisionAction;
  isSensitive: boolean;
  reason: string;
  matchedRuleId?: string;
  gracePeriodMinutes: number;
}

export class WorkflowRuleEngine {
  /**
   * Determine if a review is sensitive.
   */
  isSensitiveReview(riskAssessment: RiskAssessment): boolean {
    const sensitiveFlags: RiskAssessment['flags'] = [
      'LEGAL_THREAT',
      'SAFETY_ISSUE',
      'HARASSMENT',
      'PROFANITY',
      'COMPENSATION_REQUEST',
      'EMPLOYEE_NAMED',
      'FACTUAL_DISPUTE',
      'FALSE_ACCUSATION',
      'UNTRUSTED_CONTENT_INJECTION',
    ];

    if (riskAssessment.riskLevel === 'HIGH' || riskAssessment.riskLevel === 'CRITICAL') {
      return true;
    }

    if (riskAssessment.flags.some((flag) => sensitiveFlags.includes(flag))) {
      return true;
    }

    return false;
  }

  /**
   * Evaluates the workflow decision for a given review.
   */
  evaluateDecision(params: {
    starRating: StarRating;
    riskAssessment: RiskAssessment;
    automationMode?: AutomationMode;
    isPaused?: boolean;
    customRules?: AutomationRule[];
  }): DecisionEvaluationResult {
    const {
      starRating,
      riskAssessment,
      automationMode = 'BALANCED',
      isPaused = false,
      customRules,
    } = params;

    const isSensitive = this.isSensitiveReview(riskAssessment);

    // 1. INVARIANT: When automation is paused, no automatic publishing occurs.
    if (isPaused) {
      return {
        decision: 'REQUIRE_APPROVAL',
        isSensitive,
        reason: 'Automation is paused. Reviews are drafted and queued for manual approval.',
        gracePeriodMinutes: 0,
      };
    }

    // 2. INVARIANT: HIGH or CRITICAL risk reviews ALWAYS require approval.
    if (riskAssessment.riskLevel === 'HIGH' || riskAssessment.riskLevel === 'CRITICAL') {
      return {
        decision: 'REQUIRE_APPROVAL',
        isSensitive: true,
        reason: `High risk (${riskAssessment.riskLevel}) detected. Safety lock requires human approval.`,
        gracePeriodMinutes: 0,
      };
    }

    // 3. INVARIANT: Sensitive reviews ALWAYS require approval.
    if (isSensitive) {
      return {
        decision: 'REQUIRE_APPROVAL',
        isSensitive: true,
        reason: `Sensitive content detected (${riskAssessment.flags.join(', ')}). Manual review required.`,
        gracePeriodMinutes: 0,
      };
    }

    // 4. INVARIANT: 1-star and 2-star reviews ALWAYS require approval.
    if (starRating <= 2) {
      return {
        decision: 'REQUIRE_APPROVAL',
        isSensitive,
        reason: '1-2 star negative reviews require manual human oversight.',
        gracePeriodMinutes: 0,
      };
    }

    // 5. INVARIANT: 3-star reviews require approval by default in all modes.
    if (starRating === 3) {
      return {
        decision: 'REQUIRE_APPROVAL',
        isSensitive,
        reason: '3-star mixed reviews require manual review by default.',
        gracePeriodMinutes: 0,
      };
    }

    // 6. MODE-SPECIFIC EVALUATIONS FOR 4-STAR & 5-STAR REVIEWS

    if (automationMode === 'SAFE') {
      // SAFE mode: Everything requires approval except extremely safe 5-star reviews.
      if (
        starRating === 5 &&
        riskAssessment.riskLevel === 'LOW' &&
        riskAssessment.flags.length === 0 &&
        riskAssessment.confidenceScore >= 0.9
      ) {
        return {
          decision: 'AUTO_PUBLISH',
          isSensitive: false,
          reason: 'SAFE mode: Extremely safe 5-star review qualified for auto-publish.',
          gracePeriodMinutes: 15,
        };
      }

      return {
        decision: 'REQUIRE_APPROVAL',
        isSensitive,
        reason: 'SAFE mode: Only extremely safe 5-star reviews are auto-published. All other ratings require approval.',
        gracePeriodMinutes: 0,
      };
    }

    if (automationMode === 'BALANCED' || automationMode === 'FULL') {
      // BALANCED & FULL modes:
      // 4-star and 5-star LOW risk -> AUTO_PUBLISH
      if ((starRating === 5 || starRating === 4) && riskAssessment.riskLevel === 'LOW') {
        // Check if customer has an active custom rule
        const customRule = customRules?.find((r) => r.starRating === starRating && r.isActive);
        if (customRule) {
          if (customRule.action === 'AUTO_PUBLISH') {
            const currentSeverity = RISK_LEVEL_SEVERITY[riskAssessment.riskLevel];
            const maxSeverity = RISK_LEVEL_SEVERITY[customRule.maxRiskLevelForAutoPublish];
            if (currentSeverity <= maxSeverity) {
              return {
                decision: 'AUTO_PUBLISH',
                isSensitive: false,
                reason: `${automationMode} mode: ${starRating}-star low risk review matches custom auto-publish rule.`,
                matchedRuleId: customRule.id,
                gracePeriodMinutes: customRule.delayMinutesBeforePublish || (starRating === 5 ? 15 : 30),
              };
            }
          }
          return {
            decision: customRule.action,
            isSensitive: false,
            reason: `Custom rule specifies ${customRule.action}.`,
            matchedRuleId: customRule.id,
            gracePeriodMinutes: customRule.delayMinutesBeforePublish || 0,
          };
        }

        // Standard baseline auto-publish
        return {
          decision: 'AUTO_PUBLISH',
          isSensitive: false,
          reason: `${automationMode} mode: ${starRating}-star low risk review eligible for auto-publish.`,
          gracePeriodMinutes: starRating === 5 ? 15 : 30,
        };
      }

      // If rating is 4 or 5 but risk is MEDIUM
      return {
        decision: 'REQUIRE_APPROVAL',
        isSensitive,
        reason: `${starRating}-star review has ${riskAssessment.riskLevel} risk; held for approval.`,
        gracePeriodMinutes: 0,
      };
    }

    return {
      decision: 'REQUIRE_APPROVAL',
      isSensitive,
      reason: 'Default fallback: Manual approval required.',
      gracePeriodMinutes: 0,
    };
  }
}
