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

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'SUPPORT_AGENT' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt?: string;
  // Tenant & profile links (backward-compatibility)
  saasCustomerId?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  updatedAt?: string;
}

export type SaaSCustomerStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export interface SaaSCustomer {
  id: string;
  ownerUserId?: string;
  businessName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  industry?: string;
  status: SaaSCustomerStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Compatibility aliases
  name?: string;
  billingEmail?: string;
  subscriptionId?: string;
}

export interface Business {
  id: string;
  saasCustomerId: string;
  name: string;
  category?: string;
  timezone?: string;
  // Compatibility fields
  industryCategory?: string;
  websiteUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessAddress {
  addressLines: string[];
  locality: string;
  administrativeArea: string;
  postalCode: string;
  country: string;
}

export type LocationConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'PENDING' | 'ERROR';

export interface BusinessLocation {
  id: string;
  businessId: string;
  googleAccountId?: string;
  googleLocationId: string;
  displayName?: string;
  address: BusinessAddress;
  timezone?: string;
  connectionStatus?: LocationConnectionStatus;
  lastSyncAt?: string;
  // Tenant & operational fields (backward-compatibility)
  saasCustomerId: string;
  googlePlaceId?: string;
  locationName: string;
  primaryPhone?: string;
  primaryCategory?: string;
  isConnected: boolean;
  googleConnectionId?: string;
  automationEnabled: boolean;
  brandVoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export type GoogleConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'TOKEN_EXPIRED' | 'PERMISSION_REVOKED';

export interface GoogleConnection {
  id: string;
  saasCustomerId: string;
  provider?: 'GOOGLE_BUSINESS_PROFILE';
  encryptedTokenReference?: string;
  scopes: string[];
  status: GoogleConnectionStatus;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  // Compatibility fields
  businessLocationId?: string;
  googleAccountId?: string;
  googleLocationName?: string;
  tokenExpiry?: string;
  lastSyncedAt?: string;
}

export interface ReviewAuthor {
  displayName: string;
  profilePhotoUrl?: string;
  isAnonymous: boolean;
}

export type StarRating = 1 | 2 | 3 | 4 | 5;

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ReviewSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

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

export interface Review {
  id: string;
  businessLocationId: string;
  saasCustomerId: string;
  googleReviewName: string;
  provider?: 'GOOGLE';
  providerReviewId?: string;
  rating?: StarRating;
  authorName?: string;
  reviewText?: string;
  reviewCreatedAt: string;
  replyText?: string;
  replyStatus?: ApprovalStatus;
  sentiment?: ReviewSentiment;
  riskLevel?: RiskLevel;
  suggestedAction?: ReplyDecisionAction;
  createdAt: string;
  updatedAt: string;
  // Tenant & operational backward-compatibility
  googleReviewId?: string;
  author: ReviewAuthor;
  starRating: StarRating;
  comment?: string;
  reviewUpdatedAt?: string;
  riskAssessment?: RiskAssessment;
  replyId?: string;
  reply?: ReviewReply;
}

export type SupportTicketCategory =
  | 'BILLING'
  | 'TECHNICAL'
  | 'GOOGLE_INTEGRATION'
  | 'AI_REPLIES'
  | 'GENERAL';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SupportTicket {
  id: string;
  saasCustomerId: string;
  subject: string;
  category?: SupportTicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedAdminId?: string;
  createdAt: string;
  updatedAt: string;
  // Compatibility fields
  createdByUserEmail?: string;
  assignedSupportAgentId?: string;
}

export type SupportSenderType = 'SAAS_CUSTOMER' | 'SUPPORT_AGENT' | 'SYSTEM' | 'ADMIN';

export interface SupportMessage {
  id: string;
  supportTicketId?: string;
  senderType: SupportSenderType;
  senderId?: string;
  body?: string;
  attachmentReferences?: string[];
  createdAt: string;
  // Compatibility fields
  ticketId?: string;
  senderUserId?: string;
  senderName?: string;
  message?: string;
}

export type SubscriptionPlan = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE';

export interface Subscription {
  id: string;
  saasCustomerId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  // Limits & compatibility fields
  locationLimit?: number;
  monthlyReplyLimit?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt?: string;
  updatedAt?: string;
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
  type: UsageEventType | string;
  quantity: number;
  createdAt: string;
  // Compatibility fields
  businessLocationId?: string;
  eventType?: UsageEventType;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface AuditEvent {
  id: string;
  saasCustomerId: string;
  actorType: 'USER' | 'SYSTEM_JOB' | 'ADMIN' | 'GOOGLE_WEBHOOK';
  actorId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  // Compatibility fields
  actorUserId?: string;
  action?: string;
  targetResourceType?: 'REVIEW' | 'REPLY' | 'LOCATION' | 'AUTOMATION_RULE' | 'CONNECTION' | 'SUBSCRIPTION';
  targetResourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp?: string;
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
