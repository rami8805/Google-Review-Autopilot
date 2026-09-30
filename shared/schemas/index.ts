import type { StarRating, RiskLevel, ReplyDecisionAction } from '../types/domain';

export interface UpdateAutomationRulePayload {
  starRating: StarRating;
  maxRiskLevelForAutoPublish: RiskLevel;
  action: ReplyDecisionAction;
  delayMinutesBeforePublish: number;
  isActive: boolean;
}

export interface ApproveReplyPayload {
  reviewId: string;
  editedReplyText?: string;
}

export interface UpdateBrandVoicePayload {
  tone: 'WARM_AND_PROFESSIONAL' | 'FRIENDLY_AND_CASUAL' | 'FORMAL_AND_POLITE' | 'CONCISE_AND_DIRECT';
  signOffTemplate?: string;
  trustedBusinessContext: {
    ownerOrManagerTitle?: string;
    contactEmailForInquiries?: string;
    contactPhoneForInquiries?: string;
    coreServicesOffered: string[];
    prohibitedTopics: string[];
  };
}

export interface ReviewFilterQuery {
  locationId?: string;
  starRating?: number;
  approvalStatus?: string;
  riskLevel?: RiskLevel;
  page?: number;
  pageSize?: number;
}

export interface SignupPayload {
  email: string;
  password: string;
  name: string;
  businessName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface InviteMemberPayload {
  email: string;
  name: string;
  role?: 'CUSTOMER_MEMBER' | 'MEMBER';
}

export interface CreateCheckoutSessionPayload {
  plan: 'PRO' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  returnUrl?: string;
  idempotencyKey?: string;
}

export interface CancelSubscriptionPayload {
  cancelAtPeriodEnd?: boolean;
  reason?: string;
}
