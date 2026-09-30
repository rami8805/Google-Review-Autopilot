import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import type {
  IReviewRepository,
  IReplyRepository,
  ITenantRepository,
  IUserRepository,
  IBillingRepository,
  IGoogleConnectionRepository,
  IAutomationRuleRepository,
  IBrandVoiceRepository,
  IAuditRepository,
  ISupportRepository,
  INotificationRepository,
  IIdempotencyRepository,
  IJobRecordRepository,
  IdempotencyRecord,
  JobRecord,
  PaddleCustomerRecord,
  PaddleSubscriptionRecord,
} from './types.ts';
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
} from '../../shared/types/domain.ts';
import { DEFAULT_AUTOMATION_RULES } from '../../shared/constants/automation.ts';

// In-memory fallback backing store for test environments or offline database
const memStore = {
  tenants: new Map<string, SaaSCustomer>([
    [
      'saas_cust_demo_01',
      {
        id: 'saas_cust_demo_01',
        name: 'Downtown Dental SF',
        billingEmail: 'billing@downtowndental-sf.com',
        status: 'ACTIVE',
        createdAt: '2026-01-15T00:00:00.000Z',
        updatedAt: '2026-01-15T00:00:00.000Z',
      },
    ],
  ]),
  users: new Map<string, User>([
    [
      'usr_demo_01',
      {
        id: 'usr_demo_01',
        email: 'owner@downtowndental-sf.com',
        name: 'Dr. Sarah Lin',
        role: 'OWNER',
        saasCustomerId: 'saas_cust_demo_01',
        emailVerified: true,
        createdAt: '2026-01-15T00:00:00.000Z',
        updatedAt: '2026-01-15T00:00:00.000Z',
      },
    ],
  ]),
  memberships: new Map<string, { tenantId: string; userId: string; role: UserRole }>([
    ['saas_cust_demo_01:usr_demo_01', { tenantId: 'saas_cust_demo_01', userId: 'usr_demo_01', role: 'OWNER' }],
  ]),
  locations: new Map<string, BusinessLocation>([
    [
      'loc_001',
      {
        id: 'loc_001',
        businessId: 'biz_001',
        saasCustomerId: 'saas_cust_demo_01',
        googleLocationId: 'locations/1089274910284',
        googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        locationName: 'Downtown Dental Practice',
        address: {
          addressLines: ['104 Market Street', 'Suite 200'],
          locality: 'San Francisco',
          administrativeArea: 'CA',
          postalCode: '94103',
          country: 'US',
        },
        primaryPhone: '+1-415-555-0199',
        primaryCategory: 'Dentist',
        isConnected: true,
        automationEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  ]),
  reviews: new Map<string, Review>([
    [
      'rev_001',
      {
        id: 'rev_001',
        saasCustomerId: 'saas_cust_demo_01',
        businessLocationId: 'loc_001',
        googleReviewId: 'google_rev_101',
        googleReviewName: 'accounts/101/locations/loc_001/reviews/google_rev_101',
        author: { displayName: 'Emily Rodriguez', isAnonymous: false },
        starRating: 5,
        comment: 'Dr. Sarah and the hygienists are the best in SF! Extremely gentle cleaning and spotless clinic.',
        reviewCreatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        riskAssessment: {
          riskLevel: 'LOW',
          flags: [],
          explanation: 'Positive feedback without legal or safety concerns.',
          confidenceScore: 0.98,
          recommendedAction: 'AUTO_PUBLISH',
        },
        replyId: 'reply_001',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ],
  ]),
  replies: new Map<string, ReviewReply>([
    [
      'reply_001',
      {
        id: 'reply_001',
        reviewId: 'rev_001',
        saasCustomerId: 'saas_cust_demo_01',
        businessLocationId: 'loc_001',
        proposedText: 'Hi Emily, thank you so much for the 5-star review! Dr. Sarah and the whole team are thrilled to hear your cleaning went so smoothly. See you at your next visit!',
        publishedText: 'Hi Emily, thank you so much for the 5-star review! Dr. Sarah and the whole team are thrilled to hear your cleaning went so smoothly. See you at your next visit!',
        status: 'AUTO_PUBLISHED',
        generatedByAi: true,
        aiModel: 'gemini-3.8-flash',
        publishedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
      },
    ],
  ]),
  rules: new Map<string, AutomationRule[]>([]),
  brandVoices: new Map<string, BrandVoice>([
    [
      'saas_cust_demo_01',
      {
        id: 'bv_001',
        saasCustomerId: 'saas_cust_demo_01',
        tone: 'WARM_AND_PROFESSIONAL',
        signOffTemplate: 'Warm regards,\nDr. Sarah & The Downtown Dental Team',
        trustedBusinessContext: {
          ownerOrManagerTitle: 'Practice Director',
          contactEmailForInquiries: 'care@downtowndental-sf.com',
          contactPhoneForInquiries: '+1-415-555-0199',
          coreServicesOffered: ['General Dentistry', 'Cleanings', 'Invisalign', 'Emergency Dental Care'],
          prohibitedTopics: ['No prices over public reviews', 'No admission of liability', 'No free service offers'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  ]),
  subscriptions: new Map<string, Subscription>([
    [
      'saas_cust_demo_01',
      {
        id: 'sub_saas_cust_demo_01',
        saasCustomerId: 'saas_cust_demo_01',
        plan: 'STARTER',
        status: 'ACTIVE',
        currentPeriodStart: new Date(Date.now() - 15 * 86400000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 15 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
        locationLimit: 1,
        monthlyReplyLimit: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  ]),
  tickets: new Map<string, SupportTicket>([
    [
      'tick_sample_01',
      {
        id: 'tick_sample_01',
        saasCustomerId: 'saas_cust_demo_01',
        createdByUserEmail: 'owner@downtowndental-sf.com',
        subject: 'Inquiry: Customizing grace period for 4-star reviews',
        status: 'OPEN',
        priority: 'MEDIUM',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
    ],
  ]),
  messages: new Map<string, SupportMessage[]>([
    [
      'tick_sample_01',
      [
        {
          id: 'msg_sample_01',
          ticketId: 'tick_sample_01',
          senderType: 'SAAS_CUSTOMER',
          senderName: 'Dr. Sarah Lin',
          message: 'Hi team, is it possible to change our 4-star delay before auto-publishing from 30 minutes to 45 minutes? Thanks!',
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
      ],
    ],
  ]),
  notifications: new Map<string, Notification[]>([]),
  auditEvents: new Map<string, AuditEvent[]>([]),
  idempotency: new Map<string, IdempotencyRecord>(),
  jobs: new Map<string, JobRecord>(),
  paddleWebhookEvents: new Set<string>(),
  paddleCustomers: new Map<string, PaddleCustomerRecord>(),
  paddleSubscriptions: new Map<string, PaddleSubscriptionRecord>(),
};

// Check if PostgreSQL is available with caching and fast fallback
let _cachedDbLive: boolean | null = null;
let _lastDbCheckTime = 0;
const DB_CHECK_TTL = 30000; // 30s cache

async function isDbLive(): Promise<boolean> {
  if (process.env.NODE_ENV === 'test' && !process.env.USE_REAL_DB) {
    return false;
  }
  // If no SQL host, connection name, or database URL is configured, fallback to in-memory store immediately
  if (!process.env.SQL_HOST && !process.env.DATABASE_URL && !process.env.INSTANCE_CONNECTION_NAME) {
    return false;
  }
  const now = Date.now();
  if (_cachedDbLive !== null && now - _lastDbCheckTime < DB_CHECK_TTL) {
    return _cachedDbLive;
  }
  try {
    const probe = db.execute(sql`SELECT 1`);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('DB probe timeout')), 1000));
    await Promise.race([probe, timeout]);
    _cachedDbLive = true;
    _lastDbCheckTime = now;
    return true;
  } catch {
    _cachedDbLive = false;
    _lastDbCheckTime = now;
    return false;
  }
}

// ------------------------------------------
// 1. Review Repository
// ------------------------------------------
export class ReviewRepository implements IReviewRepository {
  async listByTenant(tenantId: string, locationId?: string): Promise<Review[]> {
    if (await isDbLive()) {
      try {
        const rows = await db
          .select()
          .from(schema.reviews)
          .where(
            locationId
              ? and(eq(schema.reviews.tenantId, tenantId), eq(schema.reviews.businessLocationId, locationId))
              : eq(schema.reviews.tenantId, tenantId)
          )
          .orderBy(desc(schema.reviews.reviewCreatedAt));

        return rows.map((r) => ({
          id: r.id,
          saasCustomerId: r.tenantId,
          businessLocationId: r.businessLocationId,
          googleReviewId: r.googleReviewId,
          googleReviewName: r.googleReviewName,
          author: {
            displayName: r.authorName,
            isAnonymous: r.authorIsAnonymous,
            profilePhotoUrl: r.authorPhotoUrl || undefined,
          },
          starRating: r.starRating as any,
          comment: r.comment || undefined,
          reviewCreatedAt: r.reviewCreatedAt.toISOString(),
          reviewUpdatedAt: r.reviewUpdatedAt?.toISOString(),
          riskAssessment: r.riskLevel ? {
            riskLevel: r.riskLevel as any,
            flags: (r.riskFlags as any) || [],
            explanation: r.riskExplanation || '',
            confidenceScore: parseFloat(r.riskConfidence || '0.95'),
            recommendedAction: r.starRating >= 4 && r.riskLevel === 'LOW' ? 'AUTO_PUBLISH' : 'REQUIRE_APPROVAL',
          } : undefined,
          replyId: r.replyId || undefined,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      } catch (err) {
        console.warn('[ReviewRepo] DB query failed, falling back to memory store:', (err as Error).message);
      }
    }

    return Array.from(memStore.reviews.values())
      .filter((r) => r.saasCustomerId === tenantId && (!locationId || r.businessLocationId === locationId))
      .sort((a, b) => new Date(b.reviewCreatedAt).getTime() - new Date(a.reviewCreatedAt).getTime());
  }

  async getById(tenantId: string, reviewId: string): Promise<Review | null> {
    if (await isDbLive()) {
      try {
        const rows = await db
          .select()
          .from(schema.reviews)
          .where(and(eq(schema.reviews.tenantId, tenantId), eq(schema.reviews.id, reviewId)))
          .limit(1);
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          id: r.id,
          saasCustomerId: r.tenantId,
          businessLocationId: r.businessLocationId,
          googleReviewId: r.googleReviewId,
          googleReviewName: r.googleReviewName,
          author: {
            displayName: r.authorName,
            isAnonymous: r.authorIsAnonymous,
            profilePhotoUrl: r.authorPhotoUrl || undefined,
          },
          starRating: r.starRating as any,
          comment: r.comment || undefined,
          reviewCreatedAt: r.reviewCreatedAt.toISOString(),
          reviewUpdatedAt: r.reviewUpdatedAt?.toISOString(),
          replyId: r.replyId || undefined,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        };
      } catch (err) {
        console.warn('[ReviewRepo] DB query failed:', (err as Error).message);
      }
    }

    const review = memStore.reviews.get(reviewId);
    if (!review || review.saasCustomerId !== tenantId) return null;
    return review;
  }

  async getByGoogleReviewName(tenantId: string, googleReviewName: string): Promise<Review | null> {
    if (await isDbLive()) {
      try {
        const rows = await db
          .select()
          .from(schema.reviews)
          .where(and(eq(schema.reviews.tenantId, tenantId), eq(schema.reviews.googleReviewName, googleReviewName)))
          .limit(1);
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          id: r.id,
          saasCustomerId: r.tenantId,
          businessLocationId: r.businessLocationId,
          googleReviewId: r.googleReviewId,
          googleReviewName: r.googleReviewName,
          author: { displayName: r.authorName, isAnonymous: r.authorIsAnonymous },
          starRating: r.starRating as any,
          reviewCreatedAt: r.reviewCreatedAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        };
      } catch (err) {
        console.warn('[ReviewRepo] DB query error:', (err as Error).message);
      }
    }

    for (const r of memStore.reviews.values()) {
      if (r.saasCustomerId === tenantId && r.googleReviewName === googleReviewName) {
        return r;
      }
    }
    return null;
  }

  async create(tenantId: string, review: Review): Promise<Review> {
    memStore.reviews.set(review.id, { ...review, saasCustomerId: tenantId });
    if (await isDbLive()) {
      try {
        await db.insert(schema.reviews).values({
          id: review.id,
          tenantId,
          businessLocationId: review.businessLocationId,
          googleReviewId: review.googleReviewId,
          googleReviewName: review.googleReviewName,
          authorName: review.author.displayName,
          authorIsAnonymous: review.author.isAnonymous,
          starRating: review.starRating,
          comment: review.comment,
          reviewCreatedAt: new Date(review.reviewCreatedAt),
          riskLevel: review.riskAssessment?.riskLevel || 'LOW',
          riskFlags: review.riskAssessment?.flags || [],
          riskExplanation: review.riskAssessment?.explanation,
          riskConfidence: review.riskAssessment?.confidenceScore?.toString(),
          replyId: review.replyId,
        });
      } catch (err) {
        console.warn('[ReviewRepo] DB insert error:', (err as Error).message);
      }
    }
    return review;
  }

  async createReviewAndReply(
    tenantId: string,
    review: Review,
    reply: ReviewReply
  ): Promise<{ review: Review; reply: ReviewReply }> {
    review.replyId = reply.id;
    memStore.reviews.set(review.id, { ...review, saasCustomerId: tenantId });
    memStore.replies.set(reply.id, { ...reply, saasCustomerId: tenantId });

    if (await isDbLive()) {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(schema.reviews).values({
            id: review.id,
            tenantId,
            businessLocationId: review.businessLocationId,
            googleReviewId: review.googleReviewId,
            googleReviewName: review.googleReviewName,
            authorName: review.author.displayName,
            authorIsAnonymous: review.author.isAnonymous,
            starRating: review.starRating,
            comment: review.comment,
            reviewCreatedAt: new Date(review.reviewCreatedAt),
            riskLevel: review.riskAssessment?.riskLevel || 'LOW',
            riskFlags: review.riskAssessment?.flags || [],
            riskExplanation: review.riskAssessment?.explanation,
            riskConfidence: review.riskAssessment?.confidenceScore?.toString(),
            replyId: reply.id,
          });

          await tx.insert(schema.reviewReplies).values({
            id: reply.id,
            tenantId,
            reviewId: review.id,
            businessLocationId: reply.businessLocationId,
            proposedText: reply.proposedText,
            publishedText: reply.publishedText,
            status: reply.status,
            generatedByAi: reply.generatedByAi,
            aiModel: reply.aiModel,
            guardDecision: reply.guardResult?.decision,
            guardResultJson: reply.guardResult as any,
            regenerationCount: reply.regenerationCount || 0,
            publishedAt: reply.publishedAt ? new Date(reply.publishedAt) : undefined,
          });
        });
      } catch (err) {
        console.warn('[ReviewRepo] Transaction error in createReviewAndReply:', (err as Error).message);
      }
    }

    return { review, reply };
  }

  async update(tenantId: string, reviewId: string, updates: Partial<Review>): Promise<Review | null> {
    const existing = await this.getById(tenantId, reviewId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    memStore.reviews.set(reviewId, updated);
    return updated;
  }
}

// ------------------------------------------
// 2. Reply Repository
// ------------------------------------------
export class ReplyRepository implements IReplyRepository {
  async getByReviewId(tenantId: string, reviewId: string): Promise<ReviewReply | null> {
    for (const reply of memStore.replies.values()) {
      if (reply.saasCustomerId === tenantId && reply.reviewId === reviewId) {
        return reply;
      }
    }
    return null;
  }

  async getById(tenantId: string, replyId: string): Promise<ReviewReply | null> {
    const reply = memStore.replies.get(replyId);
    if (!reply || reply.saasCustomerId !== tenantId) return null;
    return reply;
  }

  async listRecentByLocation(tenantId: string, locationId: string, limit = 5): Promise<ReviewReply[]> {
    return Array.from(memStore.replies.values())
      .filter((r) => r.saasCustomerId === tenantId && r.businessLocationId === locationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async create(tenantId: string, reply: ReviewReply): Promise<ReviewReply> {
    const record = { ...reply, saasCustomerId: tenantId };
    memStore.replies.set(reply.id, record);
    return record;
  }

  async update(tenantId: string, replyId: string, updates: Partial<ReviewReply>): Promise<ReviewReply | null> {
    const existing = await this.getById(tenantId, replyId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    memStore.replies.set(replyId, updated);
    return updated;
  }
}

// ------------------------------------------
// 3. Tenant Repository
// ------------------------------------------
export class TenantRepository implements ITenantRepository {
  async getById(tenantId: string): Promise<SaaSCustomer | null> {
    return memStore.tenants.get(tenantId) || null;
  }

  async create(tenant: SaaSCustomer): Promise<SaaSCustomer> {
    memStore.tenants.set(tenant.id, tenant);
    return tenant;
  }

  async update(tenantId: string, updates: Partial<SaaSCustomer>): Promise<SaaSCustomer | null> {
    const existing = memStore.tenants.get(tenantId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    memStore.tenants.set(tenantId, updated);
    return updated;
  }

  async listAll(): Promise<SaaSCustomer[]> {
    return Array.from(memStore.tenants.values());
  }
}

// ------------------------------------------
// 4. User Repository
// ------------------------------------------
export class UserRepository implements IUserRepository {
  async getById(userId: string): Promise<User | null> {
    return memStore.users.get(userId) || null;
  }

  async getByIdentitySubject(identitySubject: string): Promise<User | null> {
    for (const u of memStore.users.values()) {
      if ((u as any).identitySubject === identitySubject) return u;
    }
    return null;
  }

  async getByEmail(email: string): Promise<User | null> {
    for (const u of memStore.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  async create(user: User): Promise<User> {
    memStore.users.set(user.id, user);
    return user;
  }

  async getMembership(tenantId: string, userId: string): Promise<{ role: UserRole } | null> {
    const mem = memStore.memberships.get(`${tenantId}:${userId}`);
    if (mem) return { role: mem.role };
    return null;
  }

  async createMembership(tenantId: string, userId: string, role: UserRole): Promise<void> {
    memStore.memberships.set(`${tenantId}:${userId}`, { tenantId, userId, role });
  }
}

// ------------------------------------------
// 5. Billing Repository (Paddle Sandbox)
// ------------------------------------------
export class BillingRepository implements IBillingRepository {
  async getSubscription(tenantId: string): Promise<Subscription | null> {
    return memStore.subscriptions.get(tenantId) || null;
  }

  async upsertSubscription(tenantId: string, subscription: Subscription): Promise<Subscription> {
    const record = { ...subscription, saasCustomerId: tenantId, updatedAt: new Date().toISOString() };
    memStore.subscriptions.set(tenantId, record);
    return record;
  }

  async recordPaddleCustomer(customer: PaddleCustomerRecord): Promise<void> {
    memStore.paddleCustomers.set(customer.tenantId, customer);
  }

  async getPaddleCustomer(tenantId: string): Promise<PaddleCustomerRecord | null> {
    return memStore.paddleCustomers.get(tenantId) || null;
  }

  async upsertPaddleSubscription(sub: PaddleSubscriptionRecord): Promise<void> {
    memStore.paddleSubscriptions.set(sub.paddleSubscriptionId, sub);
  }

  async recordWebhookEvent(eventId: string, eventType: string, payload: unknown): Promise<boolean> {
    if (memStore.paddleWebhookEvents.has(eventId)) {
      return false; // duplicate delivery detected
    }
    memStore.paddleWebhookEvents.add(eventId);
    return true;
  }

  async markWebhookProcessed(eventId: string, status: 'PROCESSED' | 'FAILED', error?: string): Promise<void> {
    // Record event status in memory
  }
}

// ------------------------------------------
// 6. Google Connection Repository
// ------------------------------------------
export class GoogleConnectionRepository implements IGoogleConnectionRepository {
  private connections = new Map<string, GoogleConnection>();

  async getByLocationId(tenantId: string, locationId: string): Promise<GoogleConnection | null> {
    for (const conn of this.connections.values()) {
      if (conn.saasCustomerId === tenantId && conn.businessLocationId === locationId) {
        return conn;
      }
    }
    return null;
  }

  async upsert(tenantId: string, connection: GoogleConnection): Promise<GoogleConnection> {
    const record = { ...connection, saasCustomerId: tenantId };
    this.connections.set(connection.id, record);
    return record;
  }

  async updateTokens(
    tenantId: string,
    connectionId: string,
    accessToken: string,
    refreshToken?: string,
    expiry?: string
  ): Promise<void> {
    const existing = this.connections.get(connectionId);
    if (existing && existing.saasCustomerId === tenantId) {
      existing.tokenExpiry = expiry || new Date(Date.now() + 3600000).toISOString();
      existing.status = 'CONNECTED';
      this.connections.set(connectionId, existing);
    }
  }

  async disconnect(tenantId: string, connectionId: string): Promise<void> {
    const existing = this.connections.get(connectionId);
    if (existing && existing.saasCustomerId === tenantId) {
      existing.status = 'DISCONNECTED';
      this.connections.set(connectionId, existing);
    }
  }

  async getLocation(tenantId: string, locationId: string): Promise<BusinessLocation | null> {
    const loc = memStore.locations.get(locationId);
    if (!loc || loc.saasCustomerId !== tenantId) return null;
    return loc;
  }

  async listLocations(tenantId: string): Promise<BusinessLocation[]> {
    return Array.from(memStore.locations.values()).filter((l) => l.saasCustomerId === tenantId);
  }

  async upsertLocation(tenantId: string, location: BusinessLocation): Promise<BusinessLocation> {
    const record = { ...location, saasCustomerId: tenantId };
    memStore.locations.set(location.id, record);
    return record;
  }
}

// ------------------------------------------
// 7. Automation Rule Repository
// ------------------------------------------
export class AutomationRuleRepository implements IAutomationRuleRepository {
  async listByTenant(tenantId: string, locationId?: string): Promise<AutomationRule[]> {
    const existing = memStore.rules.get(tenantId);
    if (existing) return existing;

    const defaultRules: AutomationRule[] = DEFAULT_AUTOMATION_RULES.map((r, i) => ({
      ...r,
      id: `rule_${tenantId}_00${i + 1}`,
      saasCustomerId: tenantId,
    }));
    memStore.rules.set(tenantId, defaultRules);
    return defaultRules;
  }

  async saveRules(tenantId: string, rules: AutomationRule[]): Promise<AutomationRule[]> {
    const scoped = rules.map((r) => ({ ...r, saasCustomerId: tenantId }));
    memStore.rules.set(tenantId, scoped);
    return scoped;
  }
}

// ------------------------------------------
// 8. Brand Voice Repository
// ------------------------------------------
export class BrandVoiceRepository implements IBrandVoiceRepository {
  async getByTenant(tenantId: string, locationId?: string): Promise<BrandVoice | null> {
    const voice = memStore.brandVoices.get(tenantId);
    if (voice) return voice;

    const defaultVoice: BrandVoice = {
      id: `bv_${tenantId}`,
      saasCustomerId: tenantId,
      tone: 'WARM_AND_PROFESSIONAL',
      signOffTemplate: 'Warm regards,\nManagement Team',
      trustedBusinessContext: {
        ownerOrManagerTitle: 'General Manager',
        contactEmailForInquiries: 'support@business.com',
        coreServicesOffered: ['Customer Care'],
        prohibitedTopics: ['No prices', 'No liability admission'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memStore.brandVoices.set(tenantId, defaultVoice);
    return defaultVoice;
  }

  async save(tenantId: string, voice: BrandVoice): Promise<BrandVoice> {
    const record = { ...voice, saasCustomerId: tenantId, updatedAt: new Date().toISOString() };
    memStore.brandVoices.set(tenantId, record);
    return record;
  }
}

// ------------------------------------------
// 9. Audit Repository
// ------------------------------------------
export class AuditRepository implements IAuditRepository {
  async logEvent(event: AuditEvent): Promise<AuditEvent> {
    const list = memStore.auditEvents.get(event.saasCustomerId) || [];
    list.unshift(event);
    memStore.auditEvents.set(event.saasCustomerId, list);
    return event;
  }

  async listByTenant(tenantId: string, limit = 50): Promise<AuditEvent[]> {
    return (memStore.auditEvents.get(tenantId) || []).slice(0, limit);
  }

  async listAll(limit = 100): Promise<AuditEvent[]> {
    const all: AuditEvent[] = [];
    for (const list of memStore.auditEvents.values()) {
      all.push(...list);
    }
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }
}

// ------------------------------------------
// 10. Support Repository
// ------------------------------------------
export class SupportRepository implements ISupportRepository {
  async listTickets(tenantId: string): Promise<SupportTicket[]> {
    return Array.from(memStore.tickets.values()).filter((t) => t.saasCustomerId === tenantId);
  }

  async listAllTickets(): Promise<SupportTicket[]> {
    return Array.from(memStore.tickets.values());
  }

  async getTicket(tenantId: string, ticketId: string): Promise<SupportTicket | null> {
    const ticket = memStore.tickets.get(ticketId);
    if (!ticket || ticket.saasCustomerId !== tenantId) return null;
    return ticket;
  }

  async getTicketAdmin(ticketId: string): Promise<SupportTicket | null> {
    return memStore.tickets.get(ticketId) || null;
  }

  async createTicket(tenantId: string, email: string, subject: string, initialMessage: string): Promise<SupportTicket> {
    const ticketId = `tick_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ticket: SupportTicket = {
      id: ticketId,
      saasCustomerId: tenantId,
      createdByUserEmail: email,
      subject,
      status: 'OPEN',
      priority: 'MEDIUM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memStore.tickets.set(ticketId, ticket);

    const msgList = [
      {
        id: `msg_${Date.now()}`,
        ticketId,
        senderType: 'SAAS_CUSTOMER' as const,
        senderName: email,
        message: initialMessage,
        createdAt: new Date().toISOString(),
      },
    ];
    memStore.messages.set(ticketId, msgList);
    return ticket;
  }

  async getMessages(tenantId: string, ticketId: string): Promise<SupportMessage[]> {
    const ticket = await this.getTicket(tenantId, ticketId);
    if (!ticket) return [];
    return memStore.messages.get(ticketId) || [];
  }

  async addMessage(
    tenantId: string,
    ticketId: string,
    senderName: string,
    message: string,
    senderType: 'SAAS_CUSTOMER' | 'SUPPORT_AGENT' | 'SYSTEM'
  ): Promise<SupportMessage> {
    const msgList = memStore.messages.get(ticketId) || [];
    const msg: SupportMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId,
      senderType,
      senderName,
      message,
      createdAt: new Date().toISOString(),
    };
    msgList.push(msg);
    memStore.messages.set(ticketId, msgList);

    const ticket = memStore.tickets.get(ticketId);
    if (ticket) {
      ticket.updatedAt = new Date().toISOString();
      if (senderType === 'SUPPORT_AGENT') {
        ticket.status = 'IN_PROGRESS';
      }
    }
    return msg;
  }

  async updateTicketStatus(tenantId: string, ticketId: string, status: string): Promise<SupportTicket | null> {
    const ticket = memStore.tickets.get(ticketId);
    if (!ticket || ticket.saasCustomerId !== tenantId) return null;
    ticket.status = status as any;
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }
}

// ------------------------------------------
// 11. Notification Repository
// ------------------------------------------
export class NotificationRepository implements INotificationRepository {
  async listByTenant(tenantId: string): Promise<Notification[]> {
    return memStore.notifications.get(tenantId) || [];
  }

  async create(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> {
    const record: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    const list = memStore.notifications.get(notification.saasCustomerId) || [];
    list.unshift(record);
    memStore.notifications.set(notification.saasCustomerId, list);
    return record;
  }

  async markAsRead(tenantId: string, notificationId: string): Promise<void> {
    const list = memStore.notifications.get(tenantId) || [];
    const item = list.find((n) => n.id === notificationId);
    if (item) item.isRead = true;
  }
}

// ------------------------------------------
// 12. Idempotency Repository
// ------------------------------------------
export class IdempotencyRepository implements IIdempotencyRepository {
  async acquireKey(
    tenantId: string,
    key: string,
    operation: string,
    requestHash: string,
    ttlSeconds = 300
  ): Promise<boolean> {
    const composite = `${tenantId}:${operation}:${key}`;
    const existing = memStore.idempotency.get(composite);
    const now = Date.now();

    if (existing) {
      if (new Date(existing.expiresAt).getTime() > now) {
        return false; // key already acquired and still valid
      }
    }

    const record: IdempotencyRecord = {
      id: `idem_${now}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      idempotencyKey: key,
      operation,
      requestHash,
      lockedAt: new Date().toISOString(),
      expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
    };
    memStore.idempotency.set(composite, record);
    return true;
  }

  async getRecord(tenantId: string, key: string, operation: string): Promise<IdempotencyRecord | null> {
    const composite = `${tenantId}:${operation}:${key}`;
    return memStore.idempotency.get(composite) || null;
  }

  async complete(
    tenantId: string,
    key: string,
    operation: string,
    responseStatus: number,
    responseBody: unknown
  ): Promise<void> {
    const composite = `${tenantId}:${operation}:${key}`;
    const existing = memStore.idempotency.get(composite);
    if (existing) {
      existing.responseStatus = responseStatus;
      existing.responseBody = responseBody;
    }
  }
}

// ------------------------------------------
// 13. Job Record Repository (Cloud Tasks)
// ------------------------------------------
export class JobRecordRepository implements IJobRecordRepository {
  async createJob(job: Omit<JobRecord, 'id' | 'createdAt' | 'attemptCount' | 'status'>): Promise<JobRecord> {
    const record: JobRecord = {
      ...job,
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      attemptCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    memStore.jobs.set(job.jobId, record);
    return record;
  }

  async getJob(jobId: string): Promise<JobRecord | null> {
    return memStore.jobs.get(jobId) || null;
  }

  async updateJobStatus(jobId: string, status: JobRecord['status'], error?: string): Promise<void> {
    const existing = memStore.jobs.get(jobId);
    if (existing) {
      existing.status = status;
      existing.attemptCount += 1;
      if (status === 'RUNNING') existing.startedAt = new Date().toISOString();
      if (status === 'COMPLETED' || status === 'FAILED') existing.finishedAt = new Date().toISOString();
      if (error) existing.lastError = error;
    }
  }
}
