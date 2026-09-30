import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ==========================================
// 1. TENANTS & USERS
// ==========================================
export const tenants = pgTable(
  'tenants',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    billingEmail: text('billing_email').notNull(),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE | SUSPENDED | CANCELLED
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_tenants_status').on(table.status),
  ]
);

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    identitySubject: text('identity_subject').notNull().unique(), // Google Identity Platform UID
    email: text('email').notNull(),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_users_identity_subject').on(table.identitySubject),
    index('idx_users_email').on(table.email),
  ]
);

export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('MEMBER'), // OWNER | ADMIN | MEMBER | SUPPORT | SUPER_ADMIN
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_tenant_memberships_user_tenant').on(table.tenantId, table.userId),
    index('idx_tenant_memberships_tenant_id').on(table.tenantId),
    index('idx_tenant_memberships_user_id').on(table.userId),
  ]
);

// ==========================================
// 2. BUSINESS & LOCATIONS
// ==========================================
export const businesses = pgTable(
  'businesses',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    industryCategory: text('industry_category'),
    websiteUrl: text('website_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_businesses_tenant_id').on(table.tenantId),
  ]
);

export const businessLocations = pgTable(
  'business_locations',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
    googleLocationId: text('google_location_id').notNull(),
    googlePlaceId: text('google_place_id'),
    locationName: text('location_name').notNull(),
    addressLines: jsonb('address_lines').$type<string[]>().notNull(),
    locality: text('locality').notNull(),
    administrativeArea: text('administrative_area').notNull(),
    postalCode: text('postal_code').notNull(),
    country: text('country').notNull().default('US'),
    primaryPhone: text('primary_phone'),
    primaryCategory: text('primary_category'),
    isConnected: boolean('is_connected').notNull().default(false),
    automationEnabled: boolean('automation_enabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_locations_tenant_id').on(table.tenantId),
    uniqueIndex('idx_locations_tenant_google_loc').on(table.tenantId, table.googleLocationId),
  ]
);

export const googleConnections = pgTable(
  'google_connections',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    businessLocationId: text('business_location_id').notNull().references(() => businessLocations.id, { onDelete: 'cascade' }),
    googleAccountId: text('google_account_id').notNull(),
    googleLocationName: text('google_location_name').notNull(),
    accessTokenEncrypted: text('access_token_encrypted'),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    tokenExpiry: timestamp('token_expiry', { withTimezone: true }),
    scopes: jsonb('scopes').$type<string[]>().default([]).notNull(),
    status: text('status').notNull().default('CONNECTED'), // CONNECTED | DISCONNECTED | TOKEN_EXPIRED | PERMISSION_REVOKED
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_google_conn_tenant_id').on(table.tenantId),
    uniqueIndex('idx_google_conn_location').on(table.businessLocationId),
    uniqueIndex('idx_google_conn_tenant_loc_acc').on(table.tenantId, table.businessLocationId, table.googleAccountId),
  ]
);

// ==========================================
// 3. REVIEWS & REPLIES
// ==========================================
export const reviews = pgTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    businessLocationId: text('business_location_id').notNull().references(() => businessLocations.id, { onDelete: 'cascade' }),
    googleReviewId: text('google_review_id').notNull(),
    googleReviewName: text('google_review_name').notNull(),
    authorName: text('author_name').notNull(),
    authorIsAnonymous: boolean('author_is_anonymous').notNull().default(false),
    authorPhotoUrl: text('author_photo_url'),
    starRating: integer('star_rating').notNull(),
    comment: text('comment'),
    reviewCreatedAt: timestamp('review_created_at', { withTimezone: true }).notNull(),
    reviewUpdatedAt: timestamp('review_updated_at', { withTimezone: true }),
    riskLevel: text('risk_level').notNull().default('LOW'), // LOW | MEDIUM | HIGH | CRITICAL
    riskFlags: jsonb('risk_flags').$type<string[]>().default([]).notNull(),
    riskExplanation: text('risk_explanation'),
    riskConfidence: text('risk_confidence'),
    replyId: text('reply_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_reviews_tenant_id').on(table.tenantId),
    index('idx_reviews_location_id').on(table.businessLocationId),
    index('idx_reviews_star_rating').on(table.starRating),
    uniqueIndex('idx_reviews_tenant_google_rev').on(table.tenantId, table.googleReviewName),
  ]
);

export const reviewReplies = pgTable(
  'review_replies',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    reviewId: text('review_id').notNull().references(() => reviews.id, { onDelete: 'cascade' }),
    businessLocationId: text('business_location_id').notNull().references(() => businessLocations.id, { onDelete: 'cascade' }),
    proposedText: text('proposed_text').notNull(),
    publishedText: text('published_text'),
    status: text('status').notNull().default('PENDING_APPROVAL'), // PENDING_APPROVAL | APPROVED | AUTO_PUBLISHED | MANUALLY_PUBLISHED | REJECTED | FAILED_TO_PUBLISH
    generatedByAi: boolean('generated_by_ai').notNull().default(true),
    aiModel: text('ai_model').default('gemini-3.8-flash'),
    guardDecision: text('guard_decision'), // AUTO_PUBLISH | REQUIRE_APPROVAL | BLOCK_AND_REGENERATE | BLOCK
    guardResultJson: jsonb('guard_result_json'),
    regenerationCount: integer('regeneration_count').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    reviewedByUserId: text('reviewed_by_user_id').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    publishErrorMessage: text('publish_error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_replies_tenant_id').on(table.tenantId),
    uniqueIndex('idx_replies_review_id').on(table.reviewId),
    index('idx_replies_status').on(table.status),
  ]
);

// ==========================================
// 4. AUTOMATION RULES & BRAND VOICE
// ==========================================
export const automationRules = pgTable(
  'automation_rules',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    businessLocationId: text('business_location_id').references(() => businessLocations.id, { onDelete: 'cascade' }),
    starRating: integer('star_rating').notNull(),
    maxRiskLevelForAutoPublish: text('max_risk_level').notNull().default('LOW'),
    action: text('action').notNull().default('REQUIRE_APPROVAL'), // AUTO_PUBLISH | REQUIRE_APPROVAL | DO_NOT_REPLY
    delayMinutesBeforePublish: integer('delay_minutes').notNull().default(15),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_auto_rules_tenant_id').on(table.tenantId),
    index('idx_auto_rules_star_rating').on(table.starRating),
  ]
);

export const brandVoice = pgTable(
  'brand_voice',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    businessLocationId: text('business_location_id').references(() => businessLocations.id, { onDelete: 'cascade' }),
    tone: text('tone').notNull().default('WARM_AND_PROFESSIONAL'),
    signOffTemplate: text('sign_off_template'),
    ownerOrManagerTitle: text('owner_title'),
    contactEmailForInquiries: text('contact_email'),
    contactPhoneForInquiries: text('contact_phone'),
    coreServicesOffered: jsonb('core_services').$type<string[]>().default([]).notNull(),
    prohibitedTopics: jsonb('prohibited_topics').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_brand_voice_tenant_id').on(table.tenantId),
  ]
);

// ==========================================
// 5. PADDLE BILLING & SUBSCRIPTIONS
// ==========================================
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    paddleCustomerId: text('paddle_customer_id'),
    paddleSubscriptionId: text('paddle_subscription_id'),
    plan: text('plan').notNull().default('STARTER'), // STARTER | GROWTH | PRO | ENTERPRISE
    status: text('status').notNull().default('TRIALING'), // TRIALING | ACTIVE | PAST_DUE | CANCELED | INCOMPLETE
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    locationLimit: integer('location_limit').notNull().default(1),
    monthlyReplyLimit: integer('monthly_reply_limit').notNull().default(50),
    lastTransactionId: text('last_transaction_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_subscriptions_tenant_id').on(table.tenantId),
    index('idx_subscriptions_status').on(table.status),
  ]
);

export const paddleCustomers = pgTable(
  'paddle_customers',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    paddleCustomerId: text('paddle_customer_id').notNull().unique(),
    email: text('email').notNull(),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_paddle_customers_tenant_id').on(table.tenantId),
  ]
);

export const paddleSubscriptions = pgTable(
  'paddle_subscriptions',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    paddleSubscriptionId: text('paddle_subscription_id').notNull().unique(),
    paddleCustomerId: text('paddle_customer_id').notNull(),
    status: text('status').notNull(), // active | trialing | past_due | paused | canceled
    priceId: text('price_id'),
    currency: text('currency').default('USD'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_paddle_subs_tenant_id').on(table.tenantId),
    uniqueIndex('idx_paddle_subs_sub_id').on(table.paddleSubscriptionId),
  ]
);

export const paddleTransactions = pgTable(
  'paddle_transactions',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    paddleTransactionId: text('paddle_transaction_id').notNull().unique(),
    paddleSubscriptionId: text('paddle_subscription_id'),
    status: text('status').notNull(), // draft | ready | billed | paid | completed | canceled | past_due
    amount: text('amount').notNull(),
    currency: text('currency').notNull().default('USD'),
    billedAt: timestamp('billed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_paddle_tx_tenant_id').on(table.tenantId),
    uniqueIndex('idx_paddle_tx_tx_id').on(table.paddleTransactionId),
  ]
);

export const paddleWebhookEvents = pgTable(
  'paddle_webhook_events',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull().unique(),
    eventType: text('event_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    payloadJson: jsonb('payload_json').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    status: text('status').notNull().default('PENDING'), // PENDING | PROCESSED | FAILED
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_paddle_webhook_event_id').on(table.eventId),
    index('idx_paddle_webhook_event_type').on(table.eventType),
  ]
);

// ==========================================
// 6. AUDIT, SUPPORT & NOTIFICATIONS
// ==========================================
export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id'),
    actorType: text('actor_type').notNull().default('USER'), // USER | SYSTEM_JOB | ADMIN | GOOGLE_WEBHOOK | PADDLE_WEBHOOK
    action: text('action').notNull(),
    targetResourceType: text('target_resource_type').notNull(),
    targetResourceId: text('target_resource_id').notNull(),
    detailsJson: jsonb('details_json'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_tenant_id').on(table.tenantId),
    index('idx_audit_action').on(table.action),
    index('idx_audit_created_at').on(table.createdAt),
  ]
);

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    createdByUserEmail: text('created_by_user_email').notNull(),
    subject: text('subject').notNull(),
    status: text('status').notNull().default('OPEN'), // OPEN | IN_PROGRESS | WAITING_ON_CUSTOMER | RESOLVED | CLOSED
    priority: text('priority').notNull().default('MEDIUM'), // LOW | MEDIUM | HIGH | URGENT
    assignedSupportAgentId: text('assigned_agent_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_support_tickets_tenant_id').on(table.tenantId),
    index('idx_support_tickets_status').on(table.status),
  ]
);

export const supportMessages = pgTable(
  'support_messages',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    ticketId: text('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    senderType: text('sender_type').notNull(), // SAAS_CUSTOMER | SUPPORT_AGENT | SYSTEM
    senderUserId: text('sender_user_id'),
    senderName: text('sender_name').notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_support_msgs_tenant_id').on(table.tenantId),
    index('idx_support_msgs_ticket_id').on(table.ticketId),
  ]
);

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id'),
    type: text('type').notNull(), // APPROVAL_REQUIRED | CRITICAL_RISK_DETECTED | TOKEN_EXPIRING | PUBLISH_FAILED | MONTHLY_SUMMARY
    title: text('title').notNull(),
    message: text('message').notNull(),
    channel: text('channel').notNull().default('IN_APP'), // IN_APP | EMAIL
    isRead: boolean('is_read').notNull().default(false),
    linkUrl: text('link_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notif_tenant_id').on(table.tenantId),
    index('idx_notif_user_id').on(table.userId),
  ]
);

// ==========================================
// 7. IDEMPOTENCY & CLOUD TASKS JOB RECORDS
// ==========================================
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    idempotencyKey: text('idempotency_key').notNull(),
    operation: text('operation').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status'),
    responseBodyJson: jsonb('response_body_json'),
    lockedAt: timestamp('locked_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_idempotency_tenant_key_op').on(table.tenantId, table.idempotencyKey, table.operation),
    index('idx_idempotency_expires_at').on(table.expiresAt),
  ]
);

export const jobRecords = pgTable(
  'job_records',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    jobId: text('job_id').notNull().unique(),
    entityId: text('entity_id').notNull(),
    operation: text('operation').notNull(), // REVIEW_SYNC | AI_REPLY_PROCESSING | GOOGLE_PUBLICATION | NOTIFICATION_DELIVERY
    attemptCount: integer('attempt_count').notNull().default(0),
    status: text('status').notNull().default('PENDING'), // PENDING | RUNNING | COMPLETED | FAILED | RETRYING
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: text('locked_by'),
    availableAt: timestamp('available_at', { withTimezone: true }).defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    lastError: text('last_error'),
    idempotencyKey: text('idempotency_key'),
    payloadJson: jsonb('payload_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_jobs_tenant_id').on(table.tenantId),
    uniqueIndex('idx_jobs_job_id').on(table.jobId),
    index('idx_jobs_status').on(table.status),
    index('idx_jobs_available_at').on(table.availableAt),
    index('idx_jobs_locked_at').on(table.lockedAt),
    index('idx_jobs_idempotency_key').on(table.idempotencyKey),
  ]
);

// ==========================================
// 8. OAUTH STATE
// ==========================================
export const oauthStates = pgTable(
  'oauth_states',
  {
    id: text('id').primaryKey(),
    state: text('state').notNull().unique(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_oauth_states_state').on(table.state),
    index('idx_oauth_states_tenant_id').on(table.tenantId),
    index('idx_oauth_states_user_id').on(table.userId),
    index('idx_oauth_states_expires_at').on(table.expiresAt),
  ]
);
