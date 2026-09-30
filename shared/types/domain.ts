/**
 * Google Review Autopilot - Shared Domain Types
 *
 * CRITICAL BUSINESS MODEL DOMAIN DISTINCTIONS:
 * - User: The login identity (email, password hash / auth provider identity, role).
 * - SaaSCustomer: The paying account / tenant who subscribes to Google Review Autopilot.
 * - Business: The commercial entity owned or managed by the SaaSCustomer.
 * - BusinessLocation: A specific physical or service-area Google Business Profile location.
 * - Review: A public Google review submitted for a specific BusinessLocation.
 * - ReviewAuthor: The external person who wrote the Google review (NOT our customer).
 *
 * NOTE: The term "Customer" alone is NEVER used ambiguously in domain models.
 */

export type UserRole =
  | 'CUSTOMER_OWNER'
  | 'CUSTOMER_MEMBER'
  | 'PLATFORM_ADMIN'
  | 'OWNER'
  | 'ADMIN'
  | 'MEMBER'
  | 'SUPPORT_AGENT'
  | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  saasCustomerId: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPlan = 'TRIAL' | 'FREE' | 'PRO' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'CANCELLED'
  | 'INCOMPLETE';

export interface PlanFeatureLimits {
  locationLimit: number;
  monthlyReplyLimit: number;
  hasReviewAutomation: boolean;
  hasApprovalWorkflow: boolean;
  hasBrandVoice: boolean;
  hasGoogleIntegration: boolean;
  hasSupport: boolean;
  hasReviewHistory: boolean;
}

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  billingInterval: 'month' | 'year';
  trialDays: number;
  limits: PlanFeatureLimits;
}

export interface Subscription {
  id: string;
  saasCustomerId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
  cancelledAt?: string;
  locationLimit: number;
  monthlyReplyLimit: number;
  paymentProviderName?: string;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoice {
  id: string;
  saasCustomerId: string;
  externalInvoiceId?: string;
  amountCents: number;
  currency: string;
  status: 'PAID' | 'OPEN' | 'VOID' | 'UNCOLLECTIBLE';
  description: string;
  hostedInvoiceUrl?: string;
  pdfUrl?: string;
  paidAt?: string;
  createdAt: string;
}

export interface SaaSCustomer {
  id: string;
  name: string;
  billingEmail: string;
  subscriptionId?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'PAST_DUE' | 'TRIAL';
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  saasCustomerId: string;
  name: string;
  industryCategory?: string;
  websiteUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessLocation {
  id: string;
  businessId: string;
  saasCustomerId: string;
  googleLocationId: string;
  googlePlaceId?: string;
  locationName: string;
  address: {
    addressLines: string[];
    locality: string;
    administrativeArea: string;
    postalCode: string;
    country: string;
  };
  primaryPhone?: string;
  primaryCategory?: string;
  isConnected: boolean;
  googleConnectionId?: string;
  automationEnabled: boolean;
  brandVoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleConnection {
  id: string;
  saasCustomerId: string;
  businessLocationId: string;
  googleAccountId: string;
  googleLocationName: string;
  tokenExpiry: string;
  scopes: string[];
  status: 'CONNECTED' | 'DISCONNECTED' | 'TOKEN_EXPIRED' | 'PERMISSION_REVOKED';
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewAuthor {
  displayName: string;
  profilePhotoUrl?: string;
  isAnonymous: boolean;
}

export type StarRating = 1 | 2 | 3 | 4 | 5;

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskAssessment {
  riskLevel: RiskLevel;
  flags: Array<
    | 'LEGAL_THREAT'
    | 'SAFETY_ISSUE'
    | 'HARASSMENT'
    | 'PROFANITY'
    | 'COMPENSATION_REQUEST'
    | 'EMPLOYEE_NAMED'
    | 'FACTUAL_DISPUTE'
    | 'FALSE_ACCUSATION'
    | 'UNTRUSTED_CONTENT_INJECTION'
  >;
  explanation: string;
  confidenceScore: number;
  recommendedAction: ReplyDecisionAction;
}

export interface Review {
  id: string;
  saasCustomerId: string;
  businessLocationId: string;
  googleReviewId: string;
  googleReviewName: string; // e.g. "accounts/X/locations/Y/reviews/Z"
  author: ReviewAuthor;
  starRating: StarRating;
  comment?: string;
  reviewCreatedAt: string;
  reviewUpdatedAt?: string;
  riskAssessment?: RiskAssessment;
  replyId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApprovalStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'AUTO_PUBLISHED'
  | 'MANUALLY_PUBLISHED'
  | 'REJECTED'
  | 'FAILED_TO_PUBLISH';

export type ReplyDecisionAction = 'AUTO_PUBLISH' | 'REQUIRE_APPROVAL' | 'DO_NOT_REPLY';

export interface ReviewReply {
  id: string;
  reviewId: string;
  saasCustomerId: string;
  businessLocationId: string;
  proposedText: string;
  publishedText?: string;
  status: ApprovalStatus;
  generatedByAi: boolean;
  aiModel?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  publishedAt?: string;
  publishErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRule {
  id: string;
  saasCustomerId: string;
  businessLocationId?: string; // null means applies to all locations of this SaaSCustomer
  starRating: StarRating;
  maxRiskLevelForAutoPublish: RiskLevel;
  action: ReplyDecisionAction;
  delayMinutesBeforePublish: number; // grace period before auto publishing
  isActive: boolean;
}

export interface BrandVoice {
  id: string;
  saasCustomerId: string;
  businessLocationId?: string;
  tone: 'WARM_AND_PROFESSIONAL' | 'FRIENDLY_AND_CASUAL' | 'FORMAL_AND_POLITE' | 'CONCISE_AND_DIRECT';
  signOffTemplate?: string;
  trustedBusinessContext: {
    ownerOrManagerTitle?: string;
    contactEmailForInquiries?: string;
    contactPhoneForInquiries?: string;
    coreServicesOffered: string[];
    prohibitedTopics: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export type UsageEventType =
  | 'REVIEW_FETCHED'
  | 'AI_REPLY_GENERATED'
  | 'REPLY_AUTO_PUBLISHED'
  | 'REPLY_MANUALLY_PUBLISHED'
  | 'RISK_DETECTED_CRITICAL';

export interface UsageEvent {
  id: string;
  saasCustomerId: string;
  businessLocationId?: string;
  eventType: UsageEventType;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export type NotificationChannel = 'EMAIL' | 'IN_APP';
export type NotificationType =
  | 'APPROVAL_REQUIRED'
  | 'CRITICAL_RISK_DETECTED'
  | 'TOKEN_EXPIRING'
  | 'PUBLISH_FAILED'
  | 'MONTHLY_SUMMARY';

export interface Notification {
  id: string;
  saasCustomerId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  isRead: boolean;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SupportTicket {
  id: string;
  saasCustomerId: string;
  createdByUserEmail: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedSupportAgentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderType: 'SAAS_CUSTOMER' | 'SUPPORT_AGENT' | 'SYSTEM';
  senderUserId?: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  saasCustomerId: string;
  actorUserId?: string;
  actorType: 'USER' | 'SYSTEM_JOB' | 'ADMIN' | 'GOOGLE_WEBHOOK';
  action: string;
  targetResourceType: 'REVIEW' | 'REPLY' | 'LOCATION' | 'AUTOMATION_RULE' | 'CONNECTION' | 'SUBSCRIPTION';
  targetResourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}
