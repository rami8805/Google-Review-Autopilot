import type { StarRating, RiskLevel, ReplyDecisionAction, AutomationRule } from '../../../shared/types/domain';
import type { AiEngineInput, AiEngineOutput, AiRiskLevel, AiSentiment, BrandVoiceTone } from './types';
import { CURRENT_PROMPT_VERSION, SENSITIVE_TOPICS } from './prompts';

export interface PreAnalysisCheck {
  detectedTopics: string[];
  safetyFlags: string[];
  isPromptInjection: boolean;
  isEmptyReview: boolean;
  riskFloor: AiRiskLevel;
}

export interface PostValidationResult {
  isValid: boolean;
  violations: string[];
  sanitizedReply: string;
  enforcedAction: ReplyDecisionAction;
  enforcedRisk: AiRiskLevel;
}

/**
 * Pre-generation heuristic analysis of untrusted review text
 */
export function preAnalyzeReview(reviewText: string, rating: StarRating): PreAnalysisCheck {
  const text = (reviewText || '').trim();
  const lower = text.toLowerCase();
  const detectedTopics: string[] = [];
  const safetyFlags: string[] = [];

  const isEmptyReview = text.length === 0;

  // 1. Prompt Injection Checks
  const injectionPatterns = [
    /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
    /reveal\s+(?:your\s+)?system\s+prompt/i,
    /system\s+prompt\s*:/i,
    /you\s+are\s+now\s+(?:a|an)\b/i,
    /disregard\s+all\s+rules/i,
    /developer\s+mode/i,
    /bypass\s+safety/i,
    /as\s+an\s+ai\s+language\s+model/i,
    /print\s+instructions/i,
    /repeat\s+(?:everything\s+)?above/i,
    /<untrusted_review_content>/i,
    /<\/untrusted_review_content>/i,
  ];

  let isPromptInjection = false;
  for (const pattern of injectionPatterns) {
    if (pattern.test(lower)) {
      isPromptInjection = true;
      safetyFlags.push('PROMPT_INJECTION_ATTEMPT');
      detectedTopics.push('security_prompt_injection');
      break;
    }
  }

  // 2. Sensitive Topics Detection
  const topicMap: Record<string, RegExp[]> = {
    legal: [
      /\b(?:lawyer|attorney|sue|suing|lawsuit|legal\s+action|subpoena|court|litigat\w+)\b/i,
    ],
    threats: [
      /\b(?:threaten\w*|blackmail|destroy\s+you|pay\s+for\s+this|ruin\s+your\s+business|retaliat\w+)\b/i,
    ],
    safety: [
      /\b(?:safety|hazard|biohazard|unsafe|contamination|poison\w*|toxic|fire\s+hazard)\b/i,
    ],
    medical: [
      /\b(?:medical|doctor|hospital|infection|infected|er|emergency\s+room|allergic|allergy|malpractice)\b/i,
    ],
    injury: [
      /\b(?:injur\w+|bleed\w+|broken\s+tooth|stitches|scar|fracture|slip\s+and\s+fall|hurt\s+badly)\b/i,
    ],
    discrimination: [
      /\b(?:racis\w+|sexist|discriminat\w+|handicap|disability|homophob\w+|hate\s+speech|ada\s+violation)\b/i,
    ],
    privacy: [
      /\b(?:privacy|hipaa|doxx\w*|leaked\s+my|personal\s+information|credit\s+card\s+number)\b/i,
    ],
    fraud: [
      /\b(?:fraud\w*|scam\w*|stole|stealing|theft|robbed|forged|fake\s+charge|skimmer)\b/i,
    ],
    harassment: [
      /\b(?:harass\w+|stalk\w+|vulgar|abuse|abusive|screamed\s+at\s+me|threatened\s+me)\b/i,
    ],
    'regulatory claims': [
      /\b(?:osha|health\s+dept|health\s+department|better\s+business\s+bureau|bbb|ftc|licensing\s+board|reported\s+to)\b/i,
    ],
    'serious refund disputes': [
      /\b(?:demand\s+(?:a\s+)?refund|full\s+refund|money\s+back|chargeback|reimburse\w*|return\s+my\s+money)\b/i,
    ],
  };

  for (const [topic, patterns] of Object.entries(topicMap)) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        if (!detectedTopics.includes(topic)) {
          detectedTopics.push(topic);
        }
        break;
      }
    }
  }

  // 3. Employee naming detection (pattern: "receptionist Bob", "employee named X", "talked to X", etc.)
  if (
    /\b(?:named|employee|worker|staff|rep|technician|nurse|waiter|cashier|receptionist|manager|hygienist|assistant|server|doctor|dr\.?)\s+([A-Z][a-z]+)\b/i.test(text) ||
    /\b(?:talked\s+to|spoke\s+with|dealt\s+with|assisted\s+by|served\s+by)\s+([A-Z][a-z]+)\b/i.test(text)
  ) {
    detectedTopics.push('employee_named');
    safetyFlags.push('EMPLOYEE_MENTIONED');
  }

  // 4. Determine risk floor
  let riskFloor: AiRiskLevel = 'LOW';
  if (
    isPromptInjection ||
    detectedTopics.includes('legal') ||
    detectedTopics.includes('threats') ||
    detectedTopics.includes('safety') ||
    detectedTopics.includes('injury') ||
    detectedTopics.includes('medical')
  ) {
    riskFloor = 'CRITICAL';
  } else if (
    detectedTopics.includes('fraud') ||
    detectedTopics.includes('discrimination') ||
    detectedTopics.includes('regulatory claims') ||
    detectedTopics.includes('serious refund disputes') ||
    detectedTopics.includes('harassment') ||
    rating === 1
  ) {
    riskFloor = 'HIGH';
  } else if (rating === 2 || rating === 3) {
    riskFloor = 'MEDIUM';
  } else {
    riskFloor = 'LOW';
  }

  return {
    detectedTopics,
    safetyFlags,
    isPromptInjection,
    isEmptyReview,
    riskFloor,
  };
}

/**
 * Validates the generated AI reply against all safety prohibitions, tone rules, and decision policies.
 */
export function postValidateAiOutput(
  output: AiEngineOutput,
  input: AiEngineInput,
  preCheck: PreAnalysisCheck
): PostValidationResult {
  const violations: string[] = [];
  const reply = output.reply || '';
  const lowerReply = reply.toLowerCase();

  // 1. Check forbidden promises: refunds
  if (/\b(?:refund|money\s+back|reimburse\w*)\b/i.test(lowerReply)) {
    violations.push('FORBIDDEN_INVENTION: Promised refund or reimbursement');
  }

  // 2. Check forbidden promises: discounts
  if (/\b(?:discount|%\s*off|coupon|promo\s+code|voucher)\b/i.test(lowerReply)) {
    violations.push('FORBIDDEN_INVENTION: Offered discount or coupon');
  }

  // 3. Check forbidden promises: free compensation
  if (/\b(?:free\s+(?:meal|service|visit|cleaning|product|replacement)|compensation|settlement|gift\s+card)\b/i.test(lowerReply)) {
    violations.push('FORBIDDEN_INVENTION: Offered free compensation or settlement');
  }

  // 4. Check forbidden admission of liability or blaming the reviewer
  if (/\b(?:you\s+lied|you\s+are\s+wrong|not\s+our\s+fault|false\s+accusation|we\s+checked\s+the\s+cameras\s+and\s+you)\b/i.test(lowerReply)) {
    violations.push('TONE_VIOLATION: Argued with or blamed reviewer');
  }

  // 5. Check if system prompt or injection text was reflected
  if (/\b(?:system\s+prompt|as\s+an\s+ai|language\s+model|instructions\s+were\s+to)\b/i.test(lowerReply)) {
    violations.push('SAFETY_VIOLATION: Leaked AI system prompt or metadata');
  }

  // 6. Enforce Risk Floor
  const riskSeverity: Record<AiRiskLevel, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };

  let enforcedRisk: AiRiskLevel = output.riskLevel;
  if (riskSeverity[preCheck.riskFloor] > riskSeverity[enforcedRisk]) {
    enforcedRisk = preCheck.riskFloor;
  }

  // 7. Enforce Decision Rules:
  // - 5★ + LOW -> AUTO_PUBLISH
  // - 4★ + LOW -> AUTO_PUBLISH
  // - 3★ -> REQUIRE_APPROVAL
  // - 1-2★ -> REQUIRE_APPROVAL
  // - HIGH or CRITICAL risk -> REQUIRE_APPROVAL regardless of star rating
  let enforcedAction: ReplyDecisionAction = 'REQUIRE_APPROVAL';

  if (enforcedRisk === 'HIGH' || enforcedRisk === 'CRITICAL') {
    enforcedAction = 'REQUIRE_APPROVAL';
  } else if (input.rating >= 4 && enforcedRisk === 'LOW') {
    // If user provided custom rules, check them, otherwise default to AUTO_PUBLISH
    if (input.configuredRules) {
      const match = input.configuredRules.find((r) => r.starRating === input.rating && r.isActive);
      if (match) {
        enforcedAction = match.action;
      } else {
        enforcedAction = 'AUTO_PUBLISH';
      }
    } else {
      enforcedAction = 'AUTO_PUBLISH';
    }
  } else {
    enforcedAction = 'REQUIRE_APPROVAL';
  }

  // If there are safety violations, clean reply or fallback
  let sanitizedReply = reply;
  if (violations.length > 0) {
    sanitizedReply = buildSafeDeterministicReply(input, enforcedRisk);
  }

  return {
    isValid: violations.length === 0,
    violations,
    sanitizedReply,
    enforcedAction,
    enforcedRisk,
  };
}

/**
 * Builds a 100% compliant, guaranteed safe, non-hallucinating fallback reply
 */
export function buildSafeDeterministicReply(
  input: AiEngineInput,
  riskLevel: AiRiskLevel,
  sentiment?: AiSentiment
): string {
  const reviewer = input.reviewerName?.trim() ? input.reviewerName.trim() : '';
  const greeting = reviewer ? `Hi ${reviewer},` : 'Hello,';
  const businessName = input.businessContext?.businessName || 'our team';

  const trusted = input.brandVoice?.trustedBusinessContext || {};
  const contactEmail = trusted.contactEmailForInquiries || 'our office';
  const contactPhone = trusted.contactPhoneForInquiries || '';
  const contactInfo = contactPhone
    ? `directly at ${contactEmail} or ${contactPhone}`
    : `at ${contactEmail}`;

  const tone = (input.brandVoice?.tone || 'Professional') as BrandVoiceTone;

  if (input.rating >= 4 && riskLevel === 'LOW') {
    if (tone === 'Luxury') {
      return `${greeting} thank you for your gracious feedback. It was our distinct pleasure to serve you, and we look forward to welcoming you back to ${businessName}.`;
    }
    if (tone === 'Concise' || tone === 'CONCISE_AND_DIRECT') {
      return `${greeting} thank you for the ${input.rating}-star review. We appreciate your support.`;
    }
    if (tone === 'Friendly' || tone === 'FRIENDLY_AND_CASUAL') {
      return `${greeting} thank you so much for the fantastic ${input.rating}-star review! We loved having you and can't wait to see you again soon!`;
    }
    // Professional / Warm
    return `${greeting} thank you so much for the wonderful review! Our entire team at ${businessName} truly appreciates your support and we look forward to serving you again.`;
  }

  if (input.rating === 3) {
    return `${greeting} thank you for sharing your feedback with ${businessName}. We appreciate your perspective as we continuously strive to deliver the highest quality experience. Please feel free to reach out to us ${contactInfo} if there is anything we can do to assist.`;
  }

  // 1-2 star or High/Critical risk
  return `${greeting} thank you for taking the time to share your feedback. We take all client experiences seriously and are committed to maintaining the highest service standards. As public forums are not suitable for discussing specific details, please contact our management team ${contactInfo} so we can assist you directly.`;
}
