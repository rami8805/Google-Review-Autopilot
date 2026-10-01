import type {
  Review,
  ReviewReply,
  AutomationRule,
  BrandVoice,
  Subscription,
  SupportTicket,
  SupportMessage,
  AuditEvent,
  Notification,
  User,
  SaaSCustomer,
  BusinessLocation,
  GoogleConnection,
  UserRole,
} from '../../shared/types/domain';

export interface IdempotencyRecord {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  operation: string;
  requestHash: string;
  responseStatus?: number;
  responseBody?: unknown;
  lockedAt: string;
  expiresAt: string;
}

export interface JobRecord {
  id: string;
  tenantId: string;
  jobId: string;
  entityId: string;
  operation: string;
  attemptCount: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING';
  lockedAt?: string;
  lockedBy?: string;
  availableAt?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  finishedAt?: string;
  lastError?: string;
  idempotencyKey?: string;
  payload?: unknown;
  createdAt: string;
}

export interface OAuthStateRecord {
  id: string;
  state: string;
  tenantId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  consumedAt?: string;
}

export interface PaddleCustomerRecord {
  id: string;
  tenantId: string;
  paddleCustomerId: string;
  email: string;
  name?: string;
}

export interface PaddleSubscriptionRecord {
  id: string;
  tenantId: string;
  paddleSubscriptionId: string;
  paddleCustomerId: string;
  status: string;
  priceId?: string;
  currency?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface IReviewRepository {
  listByTenant(tenantId: string, locationId?: string): Promise<Review[]>;
  getById(tenantId: string, reviewId: string): Promise<Review | null>;
  getByGoogleReviewName(tenantId: string, googleReviewName: string): Promise<Review | null>;
  create(tenantId: string, review: Review): Promise<Review>;
  createReviewAndReply(tenantId: string, review: Review, reply: ReviewReply): Promise<{ review: Review; reply: ReviewReply }>;
  update(tenantId: string, reviewId: string, updates: Partial<Review>): Promise<Review | null>;
}

export interface IReplyRepository {
  getByReviewId(tenantId: string, reviewId: string): Promise<ReviewReply | null>;
  getById(tenantId: string, replyId: string): Promise<ReviewReply | null>;
  listRecentByLocation(tenantId: string, locationId: string, limit?: number): Promise<ReviewReply[]>;
  create(tenantId: string, reply: ReviewReply): Promise<ReviewReply>;
  update(tenantId: string, replyId: string, updates: Partial<ReviewReply>): Promise<ReviewReply | null>;
}

export interface ITenantRepository {
  getById(tenantId: string): Promise<SaaSCustomer | null>;
  create(tenant: SaaSCustomer): Promise<SaaSCustomer>;
  update(tenantId: string, updates: Partial<SaaSCustomer>): Promise<SaaSCustomer | null>;
  listAll(): Promise<SaaSCustomer[]>;
}

export interface IUserRepository {
  getById(userId: string): Promise<User | null>;
  getByIdentitySubject(identitySubject: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  getMembership(tenantId: string, userId: string): Promise<{ role: UserRole } | null>;
  createMembership(tenantId: string, userId: string, role: UserRole): Promise<void>;
}

export interface IBillingRepository {
  getSubscription(tenantId: string): Promise<Subscription | null>;
  upsertSubscription(tenantId: string, subscription: Subscription): Promise<Subscription>;
  recordPaddleCustomer(customer: PaddleCustomerRecord): Promise<void>;
  getPaddleCustomer(tenantId: string): Promise<PaddleCustomerRecord | null>;
  upsertPaddleSubscription(sub: PaddleSubscriptionRecord): Promise<void>;
  recordWebhookEvent(eventId: string, eventType: string, payload: unknown): Promise<boolean>; // returns false if duplicate
  markWebhookProcessed(eventId: string, status: 'PROCESSED' | 'FAILED', error?: string): Promise<void>;
}

export interface IGoogleConnectionRepository {
  getByLocationId(tenantId: string, locationId: string): Promise<GoogleConnection | null>;
  upsert(tenantId: string, connection: GoogleConnection): Promise<GoogleConnection>;
  updateTokens(tenantId: string, connectionId: string, accessToken: string, refreshToken?: string, expiry?: string): Promise<void>;
  /** Decrypts OAuth tokens for outbound Google API calls. Never log the result. */
  getDecryptedTokens(
    tenantId: string,
    locationId: string
  ): Promise<{ accessToken: string; refreshToken: string | null; tokenExpiry: string | null } | null>;
  disconnect(tenantId: string, connectionId: string): Promise<void>;
  getLocation(tenantId: string, locationId: string): Promise<BusinessLocation | null>;
  listLocations(tenantId: string): Promise<BusinessLocation[]>;
  upsertLocation(tenantId: string, location: BusinessLocation): Promise<BusinessLocation>;
  /** Ensures a businesses row exists for the tenant (required FK for locations). */
  ensureBusiness(tenantId: string, businessId: string, name: string): Promise<void>;
}

export interface IAutomationRuleRepository {
  listByTenant(tenantId: string, locationId?: string): Promise<AutomationRule[]>;
  saveRules(tenantId: string, rules: AutomationRule[]): Promise<AutomationRule[]>;
}

export interface IBrandVoiceRepository {
  getByTenant(tenantId: string, locationId?: string): Promise<BrandVoice | null>;
  save(tenantId: string, brandVoice: BrandVoice): Promise<BrandVoice>;
}

export interface IAuditRepository {
  logEvent(event: AuditEvent): Promise<AuditEvent>;
  listByTenant(tenantId: string, limit?: number): Promise<AuditEvent[]>;
  listAll(limit?: number): Promise<AuditEvent[]>;
}

export interface ISupportRepository {
  listTickets(tenantId: string): Promise<SupportTicket[]>;
  listAllTickets(): Promise<SupportTicket[]>;
  getTicket(tenantId: string, ticketId: string): Promise<SupportTicket | null>;
  getTicketAdmin(ticketId: string): Promise<SupportTicket | null>;
  createTicket(tenantId: string, email: string, subject: string, initialMessage: string): Promise<SupportTicket>;
  getMessages(tenantId: string, ticketId: string): Promise<SupportMessage[]>;
  addMessage(tenantId: string, ticketId: string, senderName: string, message: string, senderType: 'SAAS_CUSTOMER' | 'SUPPORT_AGENT' | 'SYSTEM'): Promise<SupportMessage>;
  updateTicketStatus(tenantId: string, ticketId: string, status: string): Promise<SupportTicket | null>;
}

export interface INotificationRepository {
  listByTenant(tenantId: string): Promise<Notification[]>;
  create(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification>;
  markAsRead(tenantId: string, notificationId: string): Promise<void>;
}

export interface IIdempotencyRepository {
  acquireKey(tenantId: string, key: string, operation: string, requestHash: string, ttlSeconds?: number): Promise<boolean>;
  getRecord(tenantId: string, key: string, operation: string): Promise<IdempotencyRecord | null>;
  complete(tenantId: string, key: string, operation: string, responseStatus: number, responseBody: unknown): Promise<void>;
}

export interface IJobRecordRepository {
  createJob(job: Omit<JobRecord, 'id' | 'createdAt' | 'attemptCount' | 'status'>): Promise<JobRecord>;
  getJob(jobId: string): Promise<JobRecord | null>;
  updateJobStatus(jobId: string, status: JobRecord['status'], error?: string): Promise<void>;
  lockJob(jobId: string, lockedBy: string): Promise<boolean>;
  completeJob(jobId: string): Promise<void>;
  failJob(jobId: string, error: string): Promise<void>;
}

export interface IOAuthStateRepository {
  createState(tenantId: string, userId: string, state: string, ttlSeconds?: number): Promise<OAuthStateRecord>;
  validateAndConsumeState(state: string): Promise<OAuthStateRecord | null>;
  getState(state: string): Promise<OAuthStateRecord | null>;
}
