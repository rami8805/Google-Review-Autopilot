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
  IOAuthStateRepository,
  IdempotencyRecord,
  JobRecord,
  OAuthStateRecord,
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

export function isUniqueConstraintError(err: any): boolean {
  if (!err) return false;
  if (err.code === '23505' || err.cause?.code === '23505' || err.cause?.data?.code === '23505') return true;
  const msg = `${err.message || ''} ${err.cause?.message || ''} ${err.cause?.data?.error || ''}`.toLowerCase();
  return (
    msg.includes('unique') ||
    msg.includes('duplicate key') ||
    msg.includes('already exists') ||
    msg.includes('23505')
  );
}

// ------------------------------------------
// Helper: Map DB Review Row to Domain Review
// ------------------------------------------
function mapReviewRow(r: typeof schema.reviews.$inferSelect): Review {
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
    reviewCreatedAt: r.reviewCreatedAt instanceof Date ? r.reviewCreatedAt.toISOString() : String(r.reviewCreatedAt),
    reviewUpdatedAt: r.reviewUpdatedAt ? (r.reviewUpdatedAt instanceof Date ? r.reviewUpdatedAt.toISOString() : String(r.reviewUpdatedAt)) : undefined,
    riskAssessment: r.riskLevel
      ? {
          riskLevel: r.riskLevel as any,
          flags: (r.riskFlags as any) || [],
          explanation: r.riskExplanation || '',
          confidenceScore: parseFloat(r.riskConfidence || '0.95'),
          recommendedAction: r.starRating >= 4 && r.riskLevel === 'LOW' ? 'AUTO_PUBLISH' : 'REQUIRE_APPROVAL',
        }
      : undefined,
    replyId: r.replyId || undefined,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  };
}

// ------------------------------------------
// Helper: Map DB Reply Row to Domain ReviewReply
// ------------------------------------------
function mapReplyRow(rep: typeof schema.reviewReplies.$inferSelect): ReviewReply {
  return {
    id: rep.id,
    saasCustomerId: rep.tenantId,
    reviewId: rep.reviewId,
    businessLocationId: rep.businessLocationId,
    proposedText: rep.proposedText,
    publishedText: rep.publishedText || undefined,
    status: rep.status as any,
    generatedByAi: rep.generatedByAi,
    aiModel: rep.aiModel || 'gemini-3.8-flash',
    guardResult: (rep.guardResultJson as any) || undefined,
    regenerationCount: rep.regenerationCount || 0,
    publishedAt: rep.publishedAt ? (rep.publishedAt instanceof Date ? rep.publishedAt.toISOString() : String(rep.publishedAt)) : undefined,
    reviewedByUserId: rep.reviewedByUserId || undefined,
    reviewedAt: rep.reviewedAt ? (rep.reviewedAt instanceof Date ? rep.reviewedAt.toISOString() : String(rep.reviewedAt)) : undefined,
    publishErrorMessage: rep.publishErrorMessage || undefined,
    createdAt: rep.createdAt instanceof Date ? rep.createdAt.toISOString() : String(rep.createdAt),
    updatedAt: rep.updatedAt instanceof Date ? rep.updatedAt.toISOString() : String(rep.updatedAt),
  };
}

// ------------------------------------------
// 1. Review Repository
// ------------------------------------------
export class ReviewRepository implements IReviewRepository {
  async listByTenant(tenantId: string, locationId?: string): Promise<Review[]> {
    const rows = await db
      .select()
      .from(schema.reviews)
      .where(
        locationId
          ? and(eq(schema.reviews.tenantId, tenantId), eq(schema.reviews.businessLocationId, locationId))
          : eq(schema.reviews.tenantId, tenantId)
      )
      .orderBy(desc(schema.reviews.reviewCreatedAt));

    return rows.map(mapReviewRow);
  }

  async getById(tenantId: string, reviewId: string): Promise<Review | null> {
    const rows = await db
      .select()
      .from(schema.reviews)
      .where(and(eq(schema.reviews.tenantId, tenantId), eq(schema.reviews.id, reviewId)));

    return rows.length > 0 ? mapReviewRow(rows[0]) : null;
  }

  async getByGoogleReviewName(tenantId: string, googleReviewName: string): Promise<Review | null> {
    const rows = await db
      .select()
      .from(schema.reviews)
      .where(and(eq(schema.reviews.tenantId, tenantId), eq(schema.reviews.googleReviewName, googleReviewName)));

    return rows.length > 0 ? mapReviewRow(rows[0]) : null;
  }

  async create(tenantId: string, review: Review): Promise<Review> {
    const [inserted] = await db
      .insert(schema.reviews)
      .values({
        id: review.id,
        tenantId,
        businessLocationId: review.businessLocationId,
        googleReviewId: review.googleReviewId,
        googleReviewName: review.googleReviewName,
        authorName: review.author.displayName,
        authorIsAnonymous: review.author.isAnonymous,
        authorPhotoUrl: review.author.profilePhotoUrl,
        starRating: review.starRating,
        comment: review.comment,
        reviewCreatedAt: new Date(review.reviewCreatedAt),
        reviewUpdatedAt: review.reviewUpdatedAt ? new Date(review.reviewUpdatedAt) : undefined,
        riskLevel: review.riskAssessment?.riskLevel || 'LOW',
        riskFlags: review.riskAssessment?.flags || [],
        riskExplanation: review.riskAssessment?.explanation,
        riskConfidence: review.riskAssessment?.confidenceScore?.toString(),
        replyId: review.replyId,
        createdAt: review.createdAt ? new Date(review.createdAt) : new Date(),
        updatedAt: review.updatedAt ? new Date(review.updatedAt) : new Date(),
      })
      .returning();

    return mapReviewRow(inserted);
  }

  /**
   * Authoritative review ingestion transaction.
   * Atomically executes in PostgreSQL:
   * BEGIN -> insert review -> insert reply -> update review.replyId -> COMMIT
   * Any failure -> ROLLBACK
   */
  async createReviewAndReply(
    tenantId: string,
    review: Review,
    reply: ReviewReply
  ): Promise<{ review: Review; reply: ReviewReply }> {
    return await db.transaction(async (tx) => {
      // 1. Insert Review
      const [insertedReview] = await tx
        .insert(schema.reviews)
        .values({
          id: review.id,
          tenantId,
          businessLocationId: review.businessLocationId,
          googleReviewId: review.googleReviewId,
          googleReviewName: review.googleReviewName,
          authorName: review.author.displayName,
          authorIsAnonymous: review.author.isAnonymous,
          authorPhotoUrl: review.author.profilePhotoUrl,
          starRating: review.starRating,
          comment: review.comment,
          reviewCreatedAt: new Date(review.reviewCreatedAt),
          reviewUpdatedAt: review.reviewUpdatedAt ? new Date(review.reviewUpdatedAt) : undefined,
          riskLevel: review.riskAssessment?.riskLevel || 'LOW',
          riskFlags: review.riskAssessment?.flags || [],
          riskExplanation: review.riskAssessment?.explanation,
          riskConfidence: review.riskAssessment?.confidenceScore?.toString(),
          replyId: reply.id,
          createdAt: review.createdAt ? new Date(review.createdAt) : new Date(),
          updatedAt: review.updatedAt ? new Date(review.updatedAt) : new Date(),
        })
        .returning();

      // 2. Insert Review Reply
      const [insertedReply] = await tx
        .insert(schema.reviewReplies)
        .values({
          id: reply.id,
          tenantId,
          reviewId: review.id,
          businessLocationId: reply.businessLocationId,
          proposedText: reply.proposedText,
          publishedText: reply.publishedText,
          status: reply.status,
          generatedByAi: reply.generatedByAi ?? true,
          aiModel: reply.aiModel || 'gemini-3.8-flash',
          guardDecision: reply.guardResult?.decision || (reply as any).guardDecision,
          guardResultJson: reply.guardResult || ((reply as any).guardChecks ? { checks: (reply as any).guardChecks } : undefined),
          regenerationCount: reply.regenerationCount || 0,
          publishedAt: reply.publishedAt ? new Date(reply.publishedAt) : undefined,
          reviewedByUserId: reply.reviewedByUserId,
          reviewedAt: reply.reviewedAt ? new Date(reply.reviewedAt) : undefined,
          publishErrorMessage: reply.publishErrorMessage,
          createdAt: reply.createdAt ? new Date(reply.createdAt) : new Date(),
          updatedAt: reply.updatedAt ? new Date(reply.updatedAt) : new Date(),
        })
        .returning();

      return {
        review: mapReviewRow(insertedReview),
        reply: mapReplyRow(insertedReply),
      };
    });
  }

  async update(tenantId: string, reviewId: string, updates: Partial<Review>): Promise<Review | null> {
    const updateValues: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (updates.comment !== undefined) updateValues.comment = updates.comment;
    if (updates.replyId !== undefined) updateValues.replyId = updates.replyId;
    if (updates.riskAssessment) {
      updateValues.riskLevel = updates.riskAssessment.riskLevel;
      updateValues.riskFlags = updates.riskAssessment.flags;
      updateValues.riskExplanation = updates.riskAssessment.explanation;
      updateValues.riskConfidence = updates.riskAssessment.confidenceScore?.toString();
    }

    const rows = await db
      .update(schema.reviews)
      .set(updateValues)
      .where(and(eq(schema.reviews.tenantId, tenantId), eq(schema.reviews.id, reviewId)))
      .returning();

    return rows.length > 0 ? mapReviewRow(rows[0]) : null;
  }
}

// ------------------------------------------
// 2. Review Reply Repository
// ------------------------------------------
export class ReplyRepository implements IReplyRepository {
  async getByReviewId(tenantId: string, reviewId: string): Promise<ReviewReply | null> {
    const rows = await db
      .select()
      .from(schema.reviewReplies)
      .where(and(eq(schema.reviewReplies.tenantId, tenantId), eq(schema.reviewReplies.reviewId, reviewId)));

    return rows.length > 0 ? mapReplyRow(rows[0]) : null;
  }

  async getById(tenantId: string, replyId: string): Promise<ReviewReply | null> {
    const rows = await db
      .select()
      .from(schema.reviewReplies)
      .where(and(eq(schema.reviewReplies.tenantId, tenantId), eq(schema.reviewReplies.id, replyId)));

    return rows.length > 0 ? mapReplyRow(rows[0]) : null;
  }

  async listRecentByLocation(tenantId: string, locationId: string, limit = 10): Promise<ReviewReply[]> {
    const rows = await db
      .select()
      .from(schema.reviewReplies)
      .where(and(eq(schema.reviewReplies.tenantId, tenantId), eq(schema.reviewReplies.businessLocationId, locationId)))
      .orderBy(desc(schema.reviewReplies.createdAt))
      .limit(limit);

    return rows.map(mapReplyRow);
  }

  async create(tenantId: string, reply: ReviewReply): Promise<ReviewReply> {
    const [inserted] = await db
      .insert(schema.reviewReplies)
      .values({
        id: reply.id,
        tenantId,
        reviewId: reply.reviewId,
        businessLocationId: reply.businessLocationId,
        proposedText: reply.proposedText,
        publishedText: reply.publishedText,
        status: reply.status,
        generatedByAi: reply.generatedByAi ?? true,
        aiModel: reply.aiModel || 'gemini-3.8-flash',
        guardDecision: reply.guardResult?.decision || (reply as any).guardDecision,
        guardResultJson: reply.guardResult || ((reply as any).guardChecks ? { checks: (reply as any).guardChecks } : undefined),
        regenerationCount: reply.regenerationCount || 0,
        publishedAt: reply.publishedAt ? new Date(reply.publishedAt) : undefined,
        reviewedByUserId: reply.reviewedByUserId,
        reviewedAt: reply.reviewedAt ? new Date(reply.reviewedAt) : undefined,
        publishErrorMessage: reply.publishErrorMessage,
        createdAt: reply.createdAt ? new Date(reply.createdAt) : new Date(),
        updatedAt: reply.updatedAt ? new Date(reply.updatedAt) : new Date(),
      })
      .returning();

    return mapReplyRow(inserted);
  }

  async update(tenantId: string, replyId: string, updates: Partial<ReviewReply>): Promise<ReviewReply | null> {
    const updateValues: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (updates.proposedText !== undefined) updateValues.proposedText = updates.proposedText;
    if (updates.publishedText !== undefined) updateValues.publishedText = updates.publishedText;
    if (updates.status !== undefined) updateValues.status = updates.status;
    if ((updates as any).guardDecision !== undefined) updateValues.guardDecision = (updates as any).guardDecision;
    if ((updates as any).guardChecks !== undefined) updateValues.guardResultJson = { checks: (updates as any).guardChecks };
    if (updates.guardResult !== undefined) {
      updateValues.guardResultJson = updates.guardResult;
      updateValues.guardDecision = updates.guardResult.decision;
    }
    if (updates.regenerationCount !== undefined) updateValues.regenerationCount = updates.regenerationCount;
    if (updates.publishedAt !== undefined) updateValues.publishedAt = updates.publishedAt ? new Date(updates.publishedAt) : null;
    if (updates.reviewedByUserId !== undefined) updateValues.reviewedByUserId = updates.reviewedByUserId;
    if (updates.reviewedAt !== undefined) updateValues.reviewedAt = updates.reviewedAt ? new Date(updates.reviewedAt) : null;
    if (updates.publishErrorMessage !== undefined) updateValues.publishErrorMessage = updates.publishErrorMessage;

    const rows = await db
      .update(schema.reviewReplies)
      .set(updateValues)
      .where(and(eq(schema.reviewReplies.tenantId, tenantId), eq(schema.reviewReplies.id, replyId)))
      .returning();

    return rows.length > 0 ? mapReplyRow(rows[0]) : null;
  }
}

// ------------------------------------------
// 3. Tenant Repository
// ------------------------------------------
export class TenantRepository implements ITenantRepository {
  async getById(tenantId: string): Promise<SaaSCustomer | null> {
    const rows = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId));
    if (rows.length === 0) return null;
    const t = rows[0];
    return {
      id: t.id,
      name: t.name,
      billingEmail: t.billingEmail,
      status: t.status as any,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  async create(tenant: SaaSCustomer): Promise<SaaSCustomer> {
    const [inserted] = await db
      .insert(schema.tenants)
      .values({
        id: tenant.id,
        name: tenant.name,
        billingEmail: tenant.billingEmail,
        status: tenant.status,
        createdAt: tenant.createdAt ? new Date(tenant.createdAt) : new Date(),
        updatedAt: tenant.updatedAt ? new Date(tenant.updatedAt) : new Date(),
      })
      .returning();

    return {
      id: inserted.id,
      name: inserted.name,
      billingEmail: inserted.billingEmail,
      status: inserted.status as any,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    };
  }

  async update(tenantId: string, updates: Partial<SaaSCustomer>): Promise<SaaSCustomer | null> {
    const updateValues: Record<string, any> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.billingEmail !== undefined) updateValues.billingEmail = updates.billingEmail;
    if (updates.status !== undefined) updateValues.status = updates.status;

    const rows = await db
      .update(schema.tenants)
      .set(updateValues)
      .where(eq(schema.tenants.id, tenantId))
      .returning();

    if (rows.length === 0) return null;
    const updated = rows[0];
    return {
      id: updated.id,
      name: updated.name,
      billingEmail: updated.billingEmail,
      status: updated.status as any,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async listAll(): Promise<SaaSCustomer[]> {
    const rows = await db.select().from(schema.tenants).orderBy(desc(schema.tenants.createdAt));
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      billingEmail: t.billingEmail,
      status: t.status as any,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }
}

// ------------------------------------------
// 4. User Repository
// ------------------------------------------
export class UserRepository implements IUserRepository {
  async getById(userId: string): Promise<User | null> {
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    if (rows.length === 0) return null;
    return this.mapUser(rows[0]);
  }

  async getByIdentitySubject(identitySubject: string): Promise<User | null> {
    const rows = await db.select().from(schema.users).where(eq(schema.users.identitySubject, identitySubject));
    if (rows.length === 0) return null;
    return this.mapUser(rows[0]);
  }

  async getByEmail(email: string): Promise<User | null> {
    const rows = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
    if (rows.length === 0) return null;
    return this.mapUser(rows[0]);
  }

  async create(user: User): Promise<User> {
    const [inserted] = await db
      .insert(schema.users)
      .values({
        id: user.id,
        identitySubject: (user as any).identitySubject || `sub_${user.id}`,
        email: user.email.toLowerCase(),
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
      })
      .returning();

    return this.mapUser(inserted);
  }

  async getMembership(tenantId: string, userId: string): Promise<{ role: UserRole } | null> {
    const rows = await db
      .select()
      .from(schema.tenantMemberships)
      .where(and(eq(schema.tenantMemberships.tenantId, tenantId), eq(schema.tenantMemberships.userId, userId)));

    if (rows.length === 0) return null;
    return { role: rows[0].role as UserRole };
  }

  async createMembership(tenantId: string, userId: string, role: UserRole): Promise<void> {
    await db
      .insert(schema.tenantMemberships)
      .values({
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId,
        userId,
        role,
      })
      .onConflictDoUpdate({
        target: [schema.tenantMemberships.tenantId, schema.tenantMemberships.userId],
        set: { role, updatedAt: new Date() },
      });
  }

  private mapUser(u: typeof schema.users.$inferSelect): User {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl || undefined,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      role: 'OWNER',
      saasCustomerId: '',
      emailVerified: true,
    };
  }
}

// ------------------------------------------
// 5. Billing Repository (PostgreSQL Authoritative)
// ------------------------------------------
export class BillingRepository implements IBillingRepository {
  async getSubscription(tenantId: string): Promise<Subscription | null> {
    const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.tenantId, tenantId));
    if (rows.length === 0) return null;
    const s = rows[0];
    return {
      id: s.id,
      saasCustomerId: s.tenantId,
      paddleCustomerId: s.paddleCustomerId || undefined,
      paddleSubscriptionId: s.paddleSubscriptionId || undefined,
      plan: s.plan as any,
      status: s.status as any,
      currentPeriodStart: s.currentPeriodStart.toISOString(),
      currentPeriodEnd: s.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      locationLimit: s.locationLimit,
      monthlyReplyLimit: s.monthlyReplyLimit,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  async upsertSubscription(tenantId: string, subscription: Subscription): Promise<Subscription> {
    const [upserted] = await db
      .insert(schema.subscriptions)
      .values({
        id: subscription.id,
        tenantId,
        paddleCustomerId: subscription.paddleCustomerId,
        paddleSubscriptionId: subscription.paddleSubscriptionId,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.currentPeriodStart),
        currentPeriodEnd: new Date(subscription.currentPeriodEnd),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        locationLimit: subscription.locationLimit,
        monthlyReplyLimit: subscription.monthlyReplyLimit,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.subscriptions.tenantId,
        set: {
          paddleCustomerId: subscription.paddleCustomerId,
          paddleSubscriptionId: subscription.paddleSubscriptionId,
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.currentPeriodStart),
          currentPeriodEnd: new Date(subscription.currentPeriodEnd),
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          locationLimit: subscription.locationLimit,
          monthlyReplyLimit: subscription.monthlyReplyLimit,
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      id: upserted.id,
      saasCustomerId: upserted.tenantId,
      paddleCustomerId: upserted.paddleCustomerId || undefined,
      paddleSubscriptionId: upserted.paddleSubscriptionId || undefined,
      plan: upserted.plan as any,
      status: upserted.status as any,
      currentPeriodStart: upserted.currentPeriodStart.toISOString(),
      currentPeriodEnd: upserted.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: upserted.cancelAtPeriodEnd,
      locationLimit: upserted.locationLimit,
      monthlyReplyLimit: upserted.monthlyReplyLimit,
      createdAt: upserted.createdAt.toISOString(),
      updatedAt: upserted.updatedAt.toISOString(),
    };
  }

  async recordPaddleCustomer(customer: PaddleCustomerRecord): Promise<void> {
    await db
      .insert(schema.paddleCustomers)
      .values({
        id: customer.id,
        tenantId: customer.tenantId,
        paddleCustomerId: customer.paddleCustomerId,
        email: customer.email,
        name: customer.name,
      })
      .onConflictDoUpdate({
        target: schema.paddleCustomers.paddleCustomerId,
        set: {
          email: customer.email,
          name: customer.name,
          updatedAt: new Date(),
        },
      });
  }

  async getPaddleCustomer(tenantId: string): Promise<PaddleCustomerRecord | null> {
    const rows = await db
      .select()
      .from(schema.paddleCustomers)
      .where(eq(schema.paddleCustomers.tenantId, tenantId));

    if (rows.length === 0) return null;
    const c = rows[0];
    return {
      id: c.id,
      tenantId: c.tenantId,
      paddleCustomerId: c.paddleCustomerId,
      email: c.email,
      name: c.name || undefined,
    };
  }

  async upsertPaddleSubscription(sub: PaddleSubscriptionRecord): Promise<void> {
    await db
      .insert(schema.paddleSubscriptions)
      .values({
        id: sub.id,
        tenantId: sub.tenantId,
        paddleSubscriptionId: sub.paddleSubscriptionId,
        paddleCustomerId: sub.paddleCustomerId,
        status: sub.status,
        priceId: sub.priceId,
        currency: sub.currency || 'USD',
        currentPeriodStart: sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : undefined,
        currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : undefined,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
      })
      .onConflictDoUpdate({
        target: schema.paddleSubscriptions.paddleSubscriptionId,
        set: {
          status: sub.status,
          priceId: sub.priceId,
          currency: sub.currency || 'USD',
          currentPeriodStart: sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : undefined,
          currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : undefined,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Atomic PostgreSQL insertion using UNIQUE(event_id).
   * Returns true if newly recorded, false if duplicate delivery detected.
   */
  async recordWebhookEvent(eventId: string, eventType: string, payload: unknown): Promise<boolean> {
    try {
      await db.insert(schema.paddleWebhookEvents).values({
        id: `pwe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        eventId,
        eventType,
        occurredAt: new Date(),
        payloadJson: payload as any,
        status: 'PENDING',
      });
      return true;
    } catch (err: any) {
      if (isUniqueConstraintError(err)) {
        return false; // duplicate delivery detected by PostgreSQL unique constraint
      }
      throw err;
    }
  }

  async markWebhookProcessed(eventId: string, status: 'PROCESSED' | 'FAILED', error?: string): Promise<void> {
    await db
      .update(schema.paddleWebhookEvents)
      .set({
        status,
        processedAt: new Date(),
        errorMessage: error,
      })
      .where(eq(schema.paddleWebhookEvents.eventId, eventId));
  }
}

// ------------------------------------------
// 6. Google Connection Repository
// ------------------------------------------
export class GoogleConnectionRepository implements IGoogleConnectionRepository {
  async getByLocationId(tenantId: string, locationId: string): Promise<GoogleConnection | null> {
    const rows = await db
      .select()
      .from(schema.googleConnections)
      .where(
        and(
          eq(schema.googleConnections.tenantId, tenantId),
          eq(schema.googleConnections.businessLocationId, locationId)
        )
      );

    if (rows.length === 0) return null;
    const c = rows[0];
    return {
      id: c.id,
      saasCustomerId: c.tenantId,
      businessLocationId: c.businessLocationId,
      googleAccountId: c.googleAccountId,
      googleLocationName: c.googleLocationName,
      accessTokenEncrypted: c.accessTokenEncrypted || undefined,
      refreshTokenEncrypted: c.refreshTokenEncrypted || undefined,
      tokenExpiry: c.tokenExpiry ? c.tokenExpiry.toISOString() : new Date().toISOString(),
      scopes: c.scopes || [],
      status: c.status as any,
      lastSyncedAt: c.lastSyncedAt ? c.lastSyncedAt.toISOString() : undefined,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    } as any;
  }

  async upsert(tenantId: string, connection: GoogleConnection): Promise<GoogleConnection> {
    const [upserted] = await db
      .insert(schema.googleConnections)
      .values({
        id: connection.id,
        tenantId,
        businessLocationId: connection.businessLocationId,
        googleAccountId: connection.googleAccountId,
        googleLocationName: connection.googleLocationName,
        accessTokenEncrypted: (connection as any).accessTokenEncrypted || null,
        refreshTokenEncrypted: (connection as any).refreshTokenEncrypted || null,
        tokenExpiry: connection.tokenExpiry ? new Date(connection.tokenExpiry) : undefined,
        scopes: connection.scopes,
        status: connection.status,
        lastSyncedAt: connection.lastSyncedAt ? new Date(connection.lastSyncedAt) : undefined,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.googleConnections.businessLocationId,
        set: {
          googleAccountId: connection.googleAccountId,
          googleLocationName: connection.googleLocationName,
          accessTokenEncrypted: (connection as any).accessTokenEncrypted || null,
          refreshTokenEncrypted: (connection as any).refreshTokenEncrypted || null,
          tokenExpiry: connection.tokenExpiry ? new Date(connection.tokenExpiry) : undefined,
          scopes: connection.scopes,
          status: connection.status,
          lastSyncedAt: connection.lastSyncedAt ? new Date(connection.lastSyncedAt) : undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      id: upserted.id,
      saasCustomerId: upserted.tenantId,
      businessLocationId: upserted.businessLocationId,
      googleAccountId: upserted.googleAccountId,
      googleLocationName: upserted.googleLocationName,
      accessTokenEncrypted: upserted.accessTokenEncrypted || undefined,
      refreshTokenEncrypted: upserted.refreshTokenEncrypted || undefined,
      tokenExpiry: upserted.tokenExpiry ? upserted.tokenExpiry.toISOString() : new Date().toISOString(),
      scopes: upserted.scopes,
      status: upserted.status as any,
      lastSyncedAt: upserted.lastSyncedAt ? upserted.lastSyncedAt.toISOString() : undefined,
      createdAt: upserted.createdAt.toISOString(),
      updatedAt: upserted.updatedAt.toISOString(),
    } as any;
  }

  async updateTokens(
    tenantId: string,
    connectionId: string,
    accessToken: string,
    refreshToken?: string,
    expiry?: string
  ): Promise<void> {
    const setValues: Record<string, any> = {
      accessTokenEncrypted: accessToken,
      tokenExpiry: expiry ? new Date(expiry) : new Date(Date.now() + 3600000),
      status: 'CONNECTED',
      updatedAt: new Date(),
    };
    if (refreshToken) setValues.refreshTokenEncrypted = refreshToken;

    await db
      .update(schema.googleConnections)
      .set(setValues)
      .where(and(eq(schema.googleConnections.tenantId, tenantId), eq(schema.googleConnections.id, connectionId)));
  }

  async disconnect(tenantId: string, connectionId: string): Promise<void> {
    await db
      .update(schema.googleConnections)
      .set({ status: 'DISCONNECTED', updatedAt: new Date() })
      .where(and(eq(schema.googleConnections.tenantId, tenantId), eq(schema.googleConnections.id, connectionId)));
  }

  async getLocation(tenantId: string, locationId: string): Promise<BusinessLocation | null> {
    const rows = await db
      .select()
      .from(schema.businessLocations)
      .where(
        and(
          eq(schema.businessLocations.tenantId, tenantId),
          eq(schema.businessLocations.id, locationId)
        )
      );

    if (rows.length === 0) return null;
    return this.mapLocation(rows[0]);
  }

  async listLocations(tenantId: string): Promise<BusinessLocation[]> {
    const rows = await db
      .select()
      .from(schema.businessLocations)
      .where(eq(schema.businessLocations.tenantId, tenantId));

    return rows.map(this.mapLocation);
  }

  async upsertLocation(tenantId: string, location: BusinessLocation): Promise<BusinessLocation> {
    const [upserted] = await db
      .insert(schema.businessLocations)
      .values({
        id: location.id,
        tenantId,
        businessId: location.businessId,
        googleLocationId: location.googleLocationId,
        googlePlaceId: location.googlePlaceId,
        locationName: location.locationName,
        addressLines: location.address.addressLines,
        locality: location.address.locality,
        administrativeArea: location.address.administrativeArea,
        postalCode: location.address.postalCode,
        country: location.address.country,
        primaryPhone: location.primaryPhone,
        primaryCategory: location.primaryCategory,
        isConnected: location.isConnected,
        automationEnabled: location.automationEnabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.businessLocations.tenantId, schema.businessLocations.googleLocationId],
        set: {
          locationName: location.locationName,
          addressLines: location.address.addressLines,
          locality: location.address.locality,
          administrativeArea: location.address.administrativeArea,
          postalCode: location.address.postalCode,
          country: location.address.country,
          primaryPhone: location.primaryPhone,
          primaryCategory: location.primaryCategory,
          isConnected: location.isConnected,
          automationEnabled: location.automationEnabled,
          updatedAt: new Date(),
        },
      })
      .returning();

    return this.mapLocation(upserted);
  }

  private mapLocation(l: typeof schema.businessLocations.$inferSelect): BusinessLocation {
    return {
      id: l.id,
      saasCustomerId: l.tenantId,
      businessId: l.businessId,
      googleLocationId: l.googleLocationId,
      googlePlaceId: l.googlePlaceId || undefined,
      locationName: l.locationName,
      address: {
        addressLines: l.addressLines,
        locality: l.locality,
        administrativeArea: l.administrativeArea,
        postalCode: l.postalCode,
        country: l.country,
      },
      primaryPhone: l.primaryPhone || undefined,
      primaryCategory: l.primaryCategory || undefined,
      isConnected: l.isConnected,
      automationEnabled: l.automationEnabled,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    };
  }
}

// ------------------------------------------
// 7. Automation Rule Repository
// ------------------------------------------
export class AutomationRuleRepository implements IAutomationRuleRepository {
  async listByTenant(tenantId: string, locationId?: string): Promise<AutomationRule[]> {
    const rows = await db
      .select()
      .from(schema.automationRules)
      .where(
        locationId
          ? and(eq(schema.automationRules.tenantId, tenantId), eq(schema.automationRules.businessLocationId, locationId))
          : eq(schema.automationRules.tenantId, tenantId)
      )
      .orderBy(schema.automationRules.starRating);

    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        saasCustomerId: r.tenantId,
        businessLocationId: r.businessLocationId || undefined,
        starRating: r.starRating as any,
        maxRiskLevelForAutoPublish: r.maxRiskLevelForAutoPublish as any,
        action: r.action as any,
        delayMinutesBeforePublish: r.delayMinutesBeforePublish,
        isActive: r.isActive,
      }));
    }

    // Initialize defaults in PostgreSQL if no rules exist for this tenant
    const defaults = DEFAULT_AUTOMATION_RULES.map((rule, idx) => ({
      id: `rule_${tenantId}_00${idx + 1}`,
      tenantId,
      starRating: rule.starRating,
      maxRiskLevelForAutoPublish: rule.maxRiskLevelForAutoPublish,
      action: rule.action,
      delayMinutesBeforePublish: rule.delayMinutesBeforePublish,
      isActive: rule.isActive,
    }));

    await db.insert(schema.automationRules).values(defaults).onConflictDoNothing();
    return defaults.map((r) => ({
      id: r.id,
      saasCustomerId: r.tenantId,
      starRating: r.starRating as any,
      maxRiskLevelForAutoPublish: r.maxRiskLevelForAutoPublish as any,
      action: r.action as any,
      delayMinutesBeforePublish: r.delayMinutesBeforePublish,
      isActive: r.isActive,
    }));
  }

  async saveRules(tenantId: string, rules: AutomationRule[]): Promise<AutomationRule[]> {
    return await db.transaction(async (tx) => {
      // Delete existing rules for tenant
      await tx.delete(schema.automationRules).where(eq(schema.automationRules.tenantId, tenantId));

      const valuesToInsert = rules.map((r, i) => ({
        id: r.id || `rule_${tenantId}_${i + 1}`,
        tenantId,
        businessLocationId: r.businessLocationId,
        starRating: r.starRating,
        maxRiskLevelForAutoPublish: r.maxRiskLevelForAutoPublish,
        action: r.action,
        delayMinutesBeforePublish: r.delayMinutesBeforePublish,
        isActive: r.isActive,
      }));

      const inserted = await tx.insert(schema.automationRules).values(valuesToInsert).returning();

      return inserted.map((r) => ({
        id: r.id,
        saasCustomerId: r.tenantId,
        businessLocationId: r.businessLocationId || undefined,
        starRating: r.starRating as any,
        maxRiskLevelForAutoPublish: r.maxRiskLevelForAutoPublish as any,
        action: r.action as any,
        delayMinutesBeforePublish: r.delayMinutesBeforePublish,
        isActive: r.isActive,
      }));
    });
  }
}

// ------------------------------------------
// 8. Brand Voice Repository
// ------------------------------------------
export class BrandVoiceRepository implements IBrandVoiceRepository {
  async getByTenant(tenantId: string, locationId?: string): Promise<BrandVoice | null> {
    const rows = await db
      .select()
      .from(schema.brandVoice)
      .where(
        locationId
          ? and(eq(schema.brandVoice.tenantId, tenantId), eq(schema.brandVoice.businessLocationId, locationId))
          : eq(schema.brandVoice.tenantId, tenantId)
      );

    if (rows.length === 0) return null;
    const bv = rows[0];
    return {
      id: bv.id,
      saasCustomerId: bv.tenantId,
      businessLocationId: bv.businessLocationId || undefined,
      tone: bv.tone as any,
      signOffTemplate: bv.signOffTemplate || undefined,
      trustedBusinessContext: {
        ownerOrManagerTitle: bv.ownerOrManagerTitle || undefined,
        contactEmailForInquiries: bv.contactEmailForInquiries || undefined,
        contactPhoneForInquiries: bv.contactPhoneForInquiries || undefined,
        coreServicesOffered: bv.coreServicesOffered || [],
        prohibitedTopics: bv.prohibitedTopics || [],
      },
      createdAt: bv.createdAt.toISOString(),
      updatedAt: bv.updatedAt.toISOString(),
    };
  }

  async save(tenantId: string, voice: BrandVoice): Promise<BrandVoice> {
    const [saved] = await db
      .insert(schema.brandVoice)
      .values({
        id: voice.id || `bv_${tenantId}`,
        tenantId,
        businessLocationId: voice.businessLocationId,
        tone: voice.tone,
        signOffTemplate: voice.signOffTemplate,
        ownerOrManagerTitle: voice.trustedBusinessContext?.ownerOrManagerTitle,
        contactEmailForInquiries: voice.trustedBusinessContext?.contactEmailForInquiries,
        contactPhoneForInquiries: voice.trustedBusinessContext?.contactPhoneForInquiries,
        coreServicesOffered: voice.trustedBusinessContext?.coreServicesOffered || [],
        prohibitedTopics: voice.trustedBusinessContext?.prohibitedTopics || [],
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.brandVoice.id,
        set: {
          tone: voice.tone,
          signOffTemplate: voice.signOffTemplate,
          ownerOrManagerTitle: voice.trustedBusinessContext?.ownerOrManagerTitle,
          contactEmailForInquiries: voice.trustedBusinessContext?.contactEmailForInquiries,
          contactPhoneForInquiries: voice.trustedBusinessContext?.contactPhoneForInquiries,
          coreServicesOffered: voice.trustedBusinessContext?.coreServicesOffered || [],
          prohibitedTopics: voice.trustedBusinessContext?.prohibitedTopics || [],
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      id: saved.id,
      saasCustomerId: saved.tenantId,
      businessLocationId: saved.businessLocationId || undefined,
      tone: saved.tone as any,
      signOffTemplate: saved.signOffTemplate || undefined,
      trustedBusinessContext: {
        ownerOrManagerTitle: saved.ownerOrManagerTitle || undefined,
        contactEmailForInquiries: saved.contactEmailForInquiries || undefined,
        contactPhoneForInquiries: saved.contactPhoneForInquiries || undefined,
        coreServicesOffered: saved.coreServicesOffered || [],
        prohibitedTopics: saved.prohibitedTopics || [],
      },
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    };
  }
}

// ------------------------------------------
// 9. Audit Repository
// ------------------------------------------
export class AuditRepository implements IAuditRepository {
  async logEvent(event: AuditEvent): Promise<AuditEvent> {
    const [inserted] = await db
      .insert(schema.auditEvents)
      .values({
        id: event.id,
        tenantId: event.saasCustomerId,
        actorUserId: event.actorUserId,
        actorType: event.actorType as any,
        action: event.action,
        targetResourceType: event.targetResourceType,
        targetResourceId: event.targetResourceId,
        detailsJson: event.details as any,
        ipAddress: event.ipAddress,
        createdAt: event.timestamp ? new Date(event.timestamp) : new Date(),
      })
      .returning();

    return {
      id: inserted.id,
      saasCustomerId: inserted.tenantId,
      actorUserId: inserted.actorUserId || undefined,
      actorType: inserted.actorType as any,
      action: inserted.action,
      targetResourceType: inserted.targetResourceType as any,
      targetResourceId: inserted.targetResourceId,
      details: (inserted.detailsJson as any) || undefined,
      ipAddress: inserted.ipAddress || undefined,
      timestamp: inserted.createdAt.toISOString(),
    };
  }

  async listByTenant(tenantId: string, limit = 50): Promise<AuditEvent[]> {
    const rows = await db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.tenantId, tenantId))
      .orderBy(desc(schema.auditEvents.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      saasCustomerId: r.tenantId,
      actorUserId: r.actorUserId || undefined,
      actorType: r.actorType as any,
      action: r.action,
      targetResourceType: r.targetResourceType as any,
      targetResourceId: r.targetResourceId,
      details: (r.detailsJson as any) || undefined,
      ipAddress: r.ipAddress || undefined,
      timestamp: r.createdAt.toISOString(),
    }));
  }

  async listAll(limit = 100): Promise<AuditEvent[]> {
    const rows = await db
      .select()
      .from(schema.auditEvents)
      .orderBy(desc(schema.auditEvents.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      saasCustomerId: r.tenantId,
      actorUserId: r.actorUserId || undefined,
      actorType: r.actorType as any,
      action: r.action,
      targetResourceType: r.targetResourceType as any,
      targetResourceId: r.targetResourceId,
      details: (r.detailsJson as any) || undefined,
      ipAddress: r.ipAddress || undefined,
      timestamp: r.createdAt.toISOString(),
    }));
  }
}

// ------------------------------------------
// 10. Support Repository
// ------------------------------------------
export class SupportRepository implements ISupportRepository {
  async listTickets(tenantId: string): Promise<SupportTicket[]> {
    const rows = await db
      .select()
      .from(schema.supportTickets)
      .where(eq(schema.supportTickets.tenantId, tenantId))
      .orderBy(desc(schema.supportTickets.createdAt));

    return rows.map(this.mapTicket);
  }

  async listAllTickets(): Promise<SupportTicket[]> {
    const rows = await db.select().from(schema.supportTickets).orderBy(desc(schema.supportTickets.createdAt));
    return rows.map(this.mapTicket);
  }

  async getTicket(tenantId: string, ticketId: string): Promise<SupportTicket | null> {
    const rows = await db
      .select()
      .from(schema.supportTickets)
      .where(and(eq(schema.supportTickets.tenantId, tenantId), eq(schema.supportTickets.id, ticketId)));

    return rows.length > 0 ? this.mapTicket(rows[0]) : null;
  }

  async getTicketAdmin(ticketId: string): Promise<SupportTicket | null> {
    const rows = await db.select().from(schema.supportTickets).where(eq(schema.supportTickets.id, ticketId));
    return rows.length > 0 ? this.mapTicket(rows[0]) : null;
  }

  async createTicket(tenantId: string, email: string, subject: string, initialMessage: string): Promise<SupportTicket> {
    return await db.transaction(async (tx) => {
      const ticketId = `tick_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const [ticket] = await tx
        .insert(schema.supportTickets)
        .values({
          id: ticketId,
          tenantId,
          createdByUserEmail: email,
          subject,
          status: 'OPEN',
          priority: 'MEDIUM',
        })
        .returning();

      await tx.insert(schema.supportMessages).values({
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId,
        ticketId,
        senderType: 'SAAS_CUSTOMER',
        senderName: email,
        message: initialMessage,
      });

      return this.mapTicket(ticket);
    });
  }

  async getMessages(tenantId: string, ticketId: string): Promise<SupportMessage[]> {
    const rows = await db
      .select()
      .from(schema.supportMessages)
      .where(and(eq(schema.supportMessages.tenantId, tenantId), eq(schema.supportMessages.ticketId, ticketId)))
      .orderBy(schema.supportMessages.createdAt);

    return rows.map((m) => ({
      id: m.id,
      ticketId: m.ticketId,
      senderType: m.senderType as any,
      senderName: m.senderName,
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async addMessage(
    tenantId: string,
    ticketId: string,
    senderName: string,
    message: string,
    senderType: 'SAAS_CUSTOMER' | 'SUPPORT_AGENT' | 'SYSTEM'
  ): Promise<SupportMessage> {
    return await db.transaction(async (tx) => {
      const [msg] = await tx
        .insert(schema.supportMessages)
        .values({
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          tenantId,
          ticketId,
          senderType,
          senderName,
          message,
        })
        .returning();

      if (senderType === 'SUPPORT_AGENT') {
        await tx
          .update(schema.supportTickets)
          .set({ status: 'IN_PROGRESS', updatedAt: new Date() })
          .where(and(eq(schema.supportTickets.tenantId, tenantId), eq(schema.supportTickets.id, ticketId)));
      } else {
        await tx
          .update(schema.supportTickets)
          .set({ updatedAt: new Date() })
          .where(and(eq(schema.supportTickets.tenantId, tenantId), eq(schema.supportTickets.id, ticketId)));
      }

      return {
        id: msg.id,
        ticketId: msg.ticketId,
        senderType: msg.senderType as any,
        senderName: msg.senderName,
        message: msg.message,
        createdAt: msg.createdAt.toISOString(),
      };
    });
  }

  async updateTicketStatus(tenantId: string, ticketId: string, status: string): Promise<SupportTicket | null> {
    const rows = await db
      .update(schema.supportTickets)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(eq(schema.supportTickets.tenantId, tenantId), eq(schema.supportTickets.id, ticketId)))
      .returning();

    return rows.length > 0 ? this.mapTicket(rows[0]) : null;
  }

  private mapTicket(t: typeof schema.supportTickets.$inferSelect): SupportTicket {
    return {
      id: t.id,
      saasCustomerId: t.tenantId,
      createdByUserEmail: t.createdByUserEmail,
      subject: t.subject,
      status: t.status as any,
      priority: t.priority as any,
      assignedSupportAgentId: t.assignedSupportAgentId || undefined,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}

// ------------------------------------------
// 11. Notification Repository
// ------------------------------------------
export class NotificationRepository implements INotificationRepository {
  async listByTenant(tenantId: string): Promise<Notification[]> {
    const rows = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.tenantId, tenantId))
      .orderBy(desc(schema.notifications.createdAt));

    return rows.map((n) => ({
      id: n.id,
      saasCustomerId: n.tenantId,
      userId: n.userId || undefined,
      type: n.type as any,
      title: n.title,
      message: n.message,
      channel: n.channel as any,
      isRead: n.isRead,
      linkUrl: n.linkUrl || undefined,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async create(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> {
    const [inserted] = await db
      .insert(schema.notifications)
      .values({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId: notification.saasCustomerId,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        channel: notification.channel || 'IN_APP',
        isRead: false,
        linkUrl: notification.linkUrl,
      })
      .returning();

    return {
      id: inserted.id,
      saasCustomerId: inserted.tenantId,
      userId: inserted.userId || undefined,
      type: inserted.type as any,
      title: inserted.title,
      message: inserted.message,
      channel: inserted.channel as any,
      isRead: inserted.isRead,
      linkUrl: inserted.linkUrl || undefined,
      createdAt: inserted.createdAt.toISOString(),
    };
  }

  async markAsRead(tenantId: string, notificationId: string): Promise<void> {
    await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(and(eq(schema.notifications.tenantId, tenantId), eq(schema.notifications.id, notificationId)));
  }
}

// ------------------------------------------
// 12. Idempotency Repository (PostgreSQL Authoritative)
// ------------------------------------------
export class IdempotencyRepository implements IIdempotencyRepository {
  /**
   * Atomically acquires an idempotency lock via PostgreSQL INSERT with UNIQUE constraint.
   * If a conflict occurs, verifies whether lock is expired.
   */
  async acquireKey(
    tenantId: string,
    key: string,
    operation: string,
    requestHash: string,
    ttlSeconds = 300
  ): Promise<boolean> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const id = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      await db.insert(schema.idempotencyKeys).values({
        id,
        tenantId,
        idempotencyKey: key,
        operation,
        requestHash,
        lockedAt: new Date(),
        expiresAt,
      });
      return true;
    } catch (err: any) {
      if (isUniqueConstraintError(err)) {
        // Key already exists. Check if previous lock expired without completion
        const existing = await this.getRecord(tenantId, key, operation);
        if (existing && new Date(existing.expiresAt) < new Date() && existing.responseStatus === undefined) {
          // Take over expired lock
          await db
            .update(schema.idempotencyKeys)
            .set({
              lockedAt: new Date(),
              expiresAt,
              requestHash,
            })
            .where(
              and(
                eq(schema.idempotencyKeys.tenantId, tenantId),
                eq(schema.idempotencyKeys.idempotencyKey, key),
                eq(schema.idempotencyKeys.operation, operation)
              )
            );
          return true;
        }
        return false; // Valid lock is active or request already completed
      }
      throw err;
    }
  }

  async getRecord(tenantId: string, key: string, operation: string): Promise<IdempotencyRecord | null> {
    const rows = await db
      .select()
      .from(schema.idempotencyKeys)
      .where(
        and(
          eq(schema.idempotencyKeys.tenantId, tenantId),
          eq(schema.idempotencyKeys.idempotencyKey, key),
          eq(schema.idempotencyKeys.operation, operation)
        )
      );

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      tenantId: r.tenantId,
      idempotencyKey: r.idempotencyKey,
      operation: r.operation,
      requestHash: r.requestHash,
      responseStatus: r.responseStatus || undefined,
      responseBody: r.responseBodyJson || undefined,
      lockedAt: r.lockedAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
    };
  }

  async complete(
    tenantId: string,
    key: string,
    operation: string,
    responseStatus: number,
    responseBody: unknown
  ): Promise<void> {
    await db
      .update(schema.idempotencyKeys)
      .set({
        responseStatus,
        responseBodyJson: responseBody as any,
      })
      .where(
        and(
          eq(schema.idempotencyKeys.tenantId, tenantId),
          eq(schema.idempotencyKeys.idempotencyKey, key),
          eq(schema.idempotencyKeys.operation, operation)
        )
      );
  }
}

// ------------------------------------------
// 13. Job Record Repository (Cloud Tasks / Durable Jobs)
// ------------------------------------------
export class JobRecordRepository implements IJobRecordRepository {
  async createJob(job: Omit<JobRecord, 'id' | 'createdAt' | 'attemptCount' | 'status'>): Promise<JobRecord> {
    const [inserted] = await db
      .insert(schema.jobRecords)
      .values({
        id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        tenantId: job.tenantId,
        jobId: job.jobId,
        entityId: job.entityId,
        operation: job.operation,
        attemptCount: 0,
        status: 'PENDING',
        payloadJson: job.payload as any,
        idempotencyKey: job.idempotencyKey,
        availableAt: job.availableAt ? new Date(job.availableAt) : new Date(),
      })
      .returning();

    return this.mapJob(inserted);
  }

  async getJob(jobId: string): Promise<JobRecord | null> {
    const rows = await db.select().from(schema.jobRecords).where(eq(schema.jobRecords.jobId, jobId));
    return rows.length > 0 ? this.mapJob(rows[0]) : null;
  }

  async updateJobStatus(jobId: string, status: JobRecord['status'], error?: string): Promise<void> {
    const setValues: Record<string, any> = {
      status,
      attemptCount: sql`${schema.jobRecords.attemptCount} + 1`,
    };

    const now = new Date();
    if (status === 'RUNNING') {
      setValues.startedAt = now;
      setValues.lockedAt = now;
    }
    if (status === 'COMPLETED') {
      setValues.completedAt = now;
      setValues.finishedAt = now;
    }
    if (status === 'FAILED') {
      setValues.failedAt = now;
      setValues.finishedAt = now;
    }
    if (error) setValues.lastError = error;

    await db.update(schema.jobRecords).set(setValues).where(eq(schema.jobRecords.jobId, jobId));
  }

  async lockJob(jobId: string, lockedBy: string): Promise<boolean> {
    const rows = await db
      .update(schema.jobRecords)
      .set({
        lockedAt: new Date(),
        lockedBy,
        status: 'RUNNING',
        startedAt: new Date(),
      })
      .where(
        and(
          eq(schema.jobRecords.jobId, jobId),
          sql`(${schema.jobRecords.lockedAt} IS NULL OR ${schema.jobRecords.lockedAt} < NOW() - INTERVAL '5 minutes')`
        )
      )
      .returning();

    return rows.length > 0;
  }

  async completeJob(jobId: string): Promise<void> {
    const now = new Date();
    await db
      .update(schema.jobRecords)
      .set({
        status: 'COMPLETED',
        completedAt: now,
        finishedAt: now,
      })
      .where(eq(schema.jobRecords.jobId, jobId));
  }

  async failJob(jobId: string, error: string): Promise<void> {
    const now = new Date();
    await db
      .update(schema.jobRecords)
      .set({
        status: 'FAILED',
        failedAt: now,
        finishedAt: now,
        lastError: error,
      })
      .where(eq(schema.jobRecords.jobId, jobId));
  }

  private mapJob(j: typeof schema.jobRecords.$inferSelect): JobRecord {
    return {
      id: j.id,
      tenantId: j.tenantId,
      jobId: j.jobId,
      entityId: j.entityId,
      operation: j.operation,
      attemptCount: j.attemptCount,
      status: j.status as any,
      lockedAt: j.lockedAt ? j.lockedAt.toISOString() : undefined,
      lockedBy: j.lockedBy || undefined,
      availableAt: j.availableAt ? j.availableAt.toISOString() : undefined,
      startedAt: j.startedAt ? j.startedAt.toISOString() : undefined,
      completedAt: j.completedAt ? j.completedAt.toISOString() : undefined,
      failedAt: j.failedAt ? j.failedAt.toISOString() : undefined,
      finishedAt: j.finishedAt ? j.finishedAt.toISOString() : undefined,
      lastError: j.lastError || undefined,
      idempotencyKey: j.idempotencyKey || undefined,
      payload: j.payloadJson,
      createdAt: j.createdAt.toISOString(),
    };
  }
}

// ------------------------------------------
// 14. OAuth State Repository (Single-Use Authoritative)
// ------------------------------------------
export class OAuthStateRepository implements IOAuthStateRepository {
  async createState(tenantId: string, userId: string, state: string, ttlSeconds = 600): Promise<OAuthStateRecord> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const id = `oauth_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const [inserted] = await db
      .insert(schema.oauthStates)
      .values({
        id,
        state,
        tenantId,
        userId,
        expiresAt,
      })
      .returning();

    return {
      id: inserted.id,
      state: inserted.state,
      tenantId: inserted.tenantId,
      userId: inserted.userId,
      createdAt: inserted.createdAt.toISOString(),
      expiresAt: inserted.expiresAt.toISOString(),
      consumedAt: inserted.consumedAt ? inserted.consumedAt.toISOString() : undefined,
    };
  }

  /**
   * Atomic single-use validation and consumption in a PostgreSQL transaction.
   * Returns OAuthStateRecord if valid and consumed; null if expired, not found, or already consumed.
   */
  async validateAndConsumeState(state: string): Promise<OAuthStateRecord | null> {
    return await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(schema.oauthStates)
        .where(eq(schema.oauthStates.state, state));

      if (rows.length === 0) return null;
      const r = rows[0];

      // Single-use check: already consumed?
      if (r.consumedAt !== null) return null;

      // Expiration check
      if (new Date(r.expiresAt).getTime() < Date.now()) return null;

      // Mark consumed atomically
      const now = new Date();
      const [consumed] = await tx
        .update(schema.oauthStates)
        .set({ consumedAt: now })
        .where(eq(schema.oauthStates.id, r.id))
        .returning();

      return {
        id: consumed.id,
        state: consumed.state,
        tenantId: consumed.tenantId,
        userId: consumed.userId,
        createdAt: consumed.createdAt.toISOString(),
        expiresAt: consumed.expiresAt.toISOString(),
        consumedAt: now.toISOString(),
      };
    });
  }

  async getState(state: string): Promise<OAuthStateRecord | null> {
    const rows = await db.select().from(schema.oauthStates).where(eq(schema.oauthStates.state, state));
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      state: r.state,
      tenantId: r.tenantId,
      userId: r.userId,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      consumedAt: r.consumedAt ? r.consumedAt.toISOString() : undefined,
    };
  }
}
