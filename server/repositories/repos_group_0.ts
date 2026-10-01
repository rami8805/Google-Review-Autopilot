import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import type {
  IReviewRepository,
  IReplyRepository,
  ITenantRepository,
  IUserRepository,
  IdempotencyRecord,
  JobRecord,
  OAuthStateRecord,
  PaddleCustomerRecord,
  PaddleSubscriptionRecord,
} from './types.ts';
import type {
  Review,
  ReviewReply,
  User,
  SaaSCustomer,
  UserRole,
} from '../../shared/types/domain.ts';

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

  async createReviewAndReply(
    tenantId: string,
    review: Review,
    reply: ReviewReply
  ): Promise<{ review: Review; reply: ReviewReply }> {
    return await db.transaction(async (tx) => {
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

      return { review: mapReviewRow(insertedReview), reply: mapReplyRow(insertedReply) };
    });
  }

  async update(tenantId: string, reviewId: string, updates: Partial<Review>): Promise<Review | null> {
    const updateValues: Record<string, any> = { updatedAt: new Date() };
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
    const updateValues: Record<string, any> = { updatedAt: new Date() };
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
    const rows = await db.update(schema.tenants).set(updateValues).where(eq(schema.tenants.id, tenantId)).returning();
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
    const rows = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (rows.length === 0) return null;
    return this.mapUser(rows[0]);
  }

  async create(user: User): Promise<User> {
    const [inserted] = await db
      .insert(schema.users)
      .values({
        id: user.id,
        identitySubject: user.identitySubject || `sub_${user.id}`,
        email: user.email,
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
        id: `mem_${tenantId}_${userId}`,
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
      identitySubject: u.identitySubject,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl || undefined,
      emailVerified: true,
      role: 'MEMBER' as UserRole,
      saasCustomerId: undefined,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  }
}
