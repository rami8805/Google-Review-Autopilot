import type { StarRating, RiskLevel, ReplyDecisionAction, AutomationRule } from '../../../shared/types/domain';

export type AiSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED';

export type AiRiskLevel = RiskLevel; // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type AiSuggestedAction = ReplyDecisionAction; // 'AUTO_PUBLISH' | 'REQUIRE_APPROVAL' | 'DO_NOT_REPLY'

export type BrandVoiceTone =
  | 'Professional'
  | 'Friendly'
  | 'Warm'
  | 'Luxury'
  | 'Concise'
  | 'WARM_AND_PROFESSIONAL'
  | 'FRIENDLY_AND_CASUAL'
  | 'FORMAL_AND_POLITE'
  | 'CONCISE_AND_DIRECT';

export interface TrustedBusinessContext {
  businessName?: string;
  ownerOrManagerTitle?: string;
  contactEmailForInquiries?: string;
  contactPhoneForInquiries?: string;
  coreServicesOffered?: string[];
  prohibitedTopics?: string[];
  officialHours?: string;
  websiteUrl?: string;
  addressSummary?: string;
  [key: string]: unknown;
}

export interface BrandVoiceInput {
  tone: BrandVoiceTone;
  signOffTemplate?: string;
  trustedBusinessContext?: TrustedBusinessContext;
}

export interface BusinessContextInput {
  businessName?: string;
  category?: string;
  addressSummary?: string;
  primaryPhone?: string;
  primaryEmail?: string;
  relevantBusinessFacts?: string[];
  [key: string]: unknown;
}

export interface AiEngineInput {
  businessContext?: BusinessContextInput;
  brandVoice?: BrandVoiceInput;
  reviewText: string;
  rating: StarRating;
  reviewerName?: string;
  relevantBusinessFacts?: string[];
  configuredRules?: AutomationRule[];
  preferredLanguage?: string;
}

export interface AiEngineOutput {
  sentiment: AiSentiment;
  riskLevel: AiRiskLevel;
  suggestedAction: AiSuggestedAction;
  reply: string;
  detectedTopics: string[];
  reasoningSummary: string;
  promptVersion: string;
  languageDetected?: string;
  safetyFlags?: string[];
  forbiddenContentViolations?: string[];
}
