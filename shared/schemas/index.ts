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

/**
 * Validation result envelope
 */
export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  data?: T;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateSaaSCustomerInput(input: Record<string, unknown>): ValidationResult<{
  ownerUserId: string;
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  industry?: string;
}> {
  const errors: string[] = [];
  if (!input.ownerUserId || typeof input.ownerUserId !== 'string') {
    errors.push('ownerUserId is required');
  }
  const businessName = (input.businessName || input.name) as string;
  if (!businessName || typeof businessName !== 'string') {
    errors.push('businessName is required');
  }
  if (!input.contactName || typeof input.contactName !== 'string') {
    errors.push('contactName is required');
  }
  const email = (input.email || input.billingEmail) as string;
  if (!email || !validateEmail(email)) {
    errors.push('Valid email is required');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      ownerUserId: input.ownerUserId as string,
      businessName,
      contactName: input.contactName as string,
      email,
      phone: typeof input.phone === 'string' ? input.phone : undefined,
      industry: typeof input.industry === 'string' ? input.industry : undefined,
    },
  };
}

export function validateBusinessLocationInput(input: Record<string, unknown>): ValidationResult<{
  businessId: string;
  googleLocationId: string;
  displayName: string;
  address: string | Record<string, unknown>;
  timezone: string;
}> {
  const errors: string[] = [];
  if (!input.businessId || typeof input.businessId !== 'string') {
    errors.push('businessId is required');
  }
  if (!input.googleLocationId || typeof input.googleLocationId !== 'string') {
    errors.push('googleLocationId is required');
  }
  const displayName = (input.displayName || input.locationName) as string;
  if (!displayName || typeof displayName !== 'string') {
    errors.push('displayName is required');
  }
  if (!input.address) {
    errors.push('address is required');
  }
  const timezone = (input.timezone as string) || 'UTC';

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      businessId: input.businessId as string,
      googleLocationId: input.googleLocationId as string,
      displayName,
      address: input.address as any,
      timezone,
    },
  };
}

export function validateReviewInput(input: Record<string, unknown>): ValidationResult<{
  businessLocationId: string;
  provider: 'GOOGLE';
  providerReviewId: string;
  rating: StarRating;
  authorName: string;
  reviewCreatedAt: string;
}> {
  const errors: string[] = [];
  if (!input.businessLocationId || typeof input.businessLocationId !== 'string') {
    errors.push('businessLocationId is required');
  }
  const providerReviewId = (input.providerReviewId || input.googleReviewId) as string;
  if (!providerReviewId || typeof providerReviewId !== 'string') {
    errors.push('providerReviewId is required');
  }
  const rating = Number(input.rating ?? input.starRating);
  if (![1, 2, 3, 4, 5].includes(rating)) {
    errors.push('rating must be an integer between 1 and 5');
  }
  const authorName = (input.authorName || (input.author as any)?.displayName || 'Anonymous Reviewer') as string;
  const reviewCreatedAt = (input.reviewCreatedAt as string) || new Date().toISOString();

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      businessLocationId: input.businessLocationId as string,
      provider: 'GOOGLE',
      providerReviewId,
      rating: rating as StarRating,
      authorName,
      reviewCreatedAt,
    },
  };
}

