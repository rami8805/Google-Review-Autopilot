import type {
  UserRole,
  SubscriptionStatus,
  TicketStatus,
  TicketPriority,
  SupportTicketCategory,
  StarRating,
  RiskLevel,
  ApprovalStatus,
  LocationConnectionStatus,
  SaaSCustomerStatus,
} from './domain';

/**
 * TenantContext is required for all data layer operations to guarantee customer isolation.
 */
export interface TenantContext {
  saasCustomerId: string;
  userId?: string;
  role?: UserRole;
  isSuperAdmin?: boolean;
}

/**
 * Idempotency record to ensure retryable operations produce identical safe results.
 */
export interface IdempotencyRecord<T = unknown> {
  idempotencyKey: string;
  action: 'IMPORT_REVIEW' | 'PUBLISH_REPLY' | 'BILLING_WEBHOOK' | 'SUPPORT_ACTION';
  saasCustomerId: string;
  resourceId?: string;
  result: T;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Query options with pagination and sorting
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastSyncAt' | 'reviewCreatedAt';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Query filters matching required index patterns
 */
export interface SaaSCustomerFilter extends QueryOptions {
  email?: string;
  status?: SaaSCustomerStatus;
}

export interface SubscriptionFilter extends QueryOptions {
  status?: SubscriptionStatus;
  plan?: string;
}

export interface SupportTicketFilter extends QueryOptions {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: SupportTicketCategory;
  assignedAdminId?: string;
}

export interface ReviewFilter extends QueryOptions {
  providerReviewId?: string;
  businessLocationId?: string;
  rating?: StarRating;
  riskLevel?: RiskLevel;
  replyStatus?: ApprovalStatus;
  provider?: string;
}

export interface LocationFilter extends QueryOptions {
  businessId?: string;
  googleLocationId?: string;
  connectionStatus?: LocationConnectionStatus;
}

export interface AuditEventFilter extends QueryOptions {
  eventType?: string;
  actorType?: string;
}

export interface UsageEventFilter extends QueryOptions {
  type?: string;
}
