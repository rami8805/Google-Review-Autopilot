/**
 * Remaining repositories (Billing, Rules, BrandVoice, Audit, Support, etc.)
 * Restored from main with minor size reductions for GitHub tool limits.
 * Full fidelity: checkout main -- server/repositories/postgresRepositories.ts
 */
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import type {
  IBillingRepository,
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
  AutomationRule,
  BrandVoice,
  Subscription,
  AuditEvent,
  SupportTicket,
  SupportMessage,
  Notification,
} from '../../shared/types/domain.ts';
import { DEFAULT_AUTOMATION_RULES } from '../../shared/constants/automation.ts';

function isUniqueConstraintError(err: any): boolean {
  if (!err) return false;
  if (err.code === '23505' || err.cause?.code === '23505') return true;
  const msg = `${err.message || ''}`.toLowerCase();
  return msg.includes('unique') || msg.includes('duplicate') || msg.includes('23505');
}

export class BillingRepository implements IBillingRepository {
  async getSubscription(tenantId: string): Promise<Subscription | null> {
    const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.tenantId, tenantId));
    if (!rows.length) return null;
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
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.currentPeriodStart),
          currentPeriodEnd: new Date(subscription.currentPeriodEnd),
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          locationLimit: subscription.locationLimit,
          monthlyReplyLimit: subscription.monthlyReplyLimit,
          paddleCustomerId: subscription.paddleCustomerId,
          paddleSubscriptionId: subscription.paddleSubscriptionId,
          updatedAt: new Date(),
        },
      })
      .returning();
    return this.getSubscription(tenantId) as Promise<Subscription>;
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
        set: { email: customer.email, name: customer.name, updatedAt: new Date() },
      });
  }

  async getPaddleCustomer(tenantId: string): Promise<PaddleCustomerRecord | null> {
    const rows = await db.select().from(schema.paddleCustomers).where(eq(schema.paddleCustomers.tenantId, tenantId));
    if (!rows.length) return null;
    const c = rows[0];
    return { id: c.id, tenantId: c.tenantId, paddleCustomerId: c.paddleCustomerId, email: c.email, name: c.name || undefined };
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
          currentPeriodStart: sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : undefined,
          currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : undefined,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
          updatedAt: new Date(),
        },
      });
  }

  async recordWebhookEvent(eventId: string, eventType: string, payload: unknown): Promise<boolean> {
    try {
      await db.insert(schema.paddleWebhookEvents).values({
        id: `pwe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        eventId,
        eventType,
        occurredAt: new Date(),
        payloadJson: payload as any,
        status: 'PENDING',
      });
      return true;
    } catch (err: any) {
      if (isUniqueConstraintError(err)) return false;
      throw err;
    }
  }

  async markWebhookProcessed(eventId: string, status: 'PROCESSED' | 'FAILED', error?: string): Promise<void> {
    await db
      .update(schema.paddleWebhookEvents)
      .set({ status, processedAt: new Date(), errorMessage: error })
      .where(eq(schema.paddleWebhookEvents.eventId, eventId));
  }
}

export class AutomationRuleRepository implements IAutomationRuleRepository {
  async listByTenant(tenantId: string, _locationId?: string): Promise<AutomationRule[]> {
    const rows = await db.select().from(schema.automationRules).where(eq(schema.automationRules.tenantId, tenantId));
    if (!rows.length) {
      return DEFAULT_AUTOMATION_RULES.map((r, i) => ({
        ...r,
        id: `rule_${tenantId}_${i}`,
        saasCustomerId: tenantId,
      })) as AutomationRule[];
    }
    return rows.map((r) => ({
      id: r.id,
      saasCustomerId: r.tenantId,
      businessLocationId: r.businessLocationId || undefined,
      starRating: r.starRating as any,
      maxRiskLevelForAutoPublish: r.maxRiskLevelForAutoPublish as any,
      action: r.action as any,
      delayMinutesBeforePublish: r.delayMinutesBeforePublish,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async saveRules(tenantId: string, rules: AutomationRule[]): Promise<AutomationRule[]> {
    await db.delete(schema.automationRules).where(eq(schema.automationRules.tenantId, tenantId));
    for (const rule of rules) {
      const action = rule.starRating <= 3 ? 'REQUIRE_APPROVAL' : rule.action;
      const maxRisk = rule.starRating <= 3 ? 'LOW' : rule.maxRiskLevelForAutoPublish;
      await db.insert(schema.automationRules).values({
        id: rule.id || `rule_${tenantId}_${rule.starRating}`,
        tenantId,
        businessLocationId: rule.businessLocationId,
        starRating: rule.starRating,
        maxRiskLevelForAutoPublish: maxRisk,
        action,
        delayMinutesBeforePublish: rule.delayMinutesBeforePublish ?? 15,
        isActive: rule.isActive ?? true,
      });
    }
    return this.listByTenant(tenantId);
  }
}

export class BrandVoiceRepository implements IBrandVoiceRepository {
  async getByTenant(tenantId: string, _locationId?: string): Promise<BrandVoice | null> {
    const rows = await db.select().from(schema.brandVoice).where(eq(schema.brandVoice.tenantId, tenantId));
    if (!rows.length) return null;
    const b = rows[0];
    return {
      id: b.id,
      saasCustomerId: b.tenantId,
      businessLocationId: b.businessLocationId || undefined,
      tone: b.tone as any,
      signOffTemplate: b.signOffTemplate || undefined,
      trustedBusinessContext: {
        ownerOrManagerTitle: b.ownerOrManagerTitle || undefined,
        contactEmailForInquiries: b.contactEmailForInquiries || undefined,
        contactPhoneForInquiries: b.contactPhoneForInquiries || undefined,
        coreServicesOffered: (b.coreServicesOffered as string[]) || [],
        prohibitedTopics: (b.prohibitedTopics as string[]) || [],
      },
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }

  async save(tenantId: string, brandVoice: BrandVoice): Promise<BrandVoice> {
    const ctx = brandVoice.trustedBusinessContext || ({} as any);
    await db
      .insert(schema.brandVoice)
      .values({
        id: brandVoice.id,
        tenantId,
        businessLocationId: brandVoice.businessLocationId,
        tone: brandVoice.tone,
        signOffTemplate: brandVoice.signOffTemplate,
        ownerOrManagerTitle: ctx.ownerOrManagerTitle,
        contactEmailForInquiries: ctx.contactEmailForInquiries,
        contactPhoneForInquiries: ctx.contactPhoneForInquiries,
        coreServicesOffered: ctx.coreServicesOffered || [],
        prohibitedTopics: ctx.prohibitedTopics || [],
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.brandVoice.id,
        set: {
          tone: brandVoice.tone,
          signOffTemplate: brandVoice.signOffTemplate,
          ownerOrManagerTitle: ctx.ownerOrManagerTitle,
          contactEmailForInquiries: ctx.contactEmailForInquiries,
          contactPhoneForInquiries: ctx.contactPhoneForInquiries,
          coreServicesOffered: ctx.coreServicesOffered || [],
          prohibitedTopics: ctx.prohibitedTopics || [],
          updatedAt: new Date(),
        },
      });
    return (await this.getByTenant(tenantId))!;
  }
}

export class AuditRepository implements IAuditRepository {
  async logEvent(event: AuditEvent): Promise<AuditEvent> {
    await db.insert(schema.auditEvents).values({
      id: event.id,
      tenantId: event.saasCustomerId,
      actorUserId: event.actorUserId,
      actorType: event.actorType,
      action: event.action,
      targetResourceType: event.targetResourceType,
      targetResourceId: event.targetResourceId,
      detailsJson: event.details,
      ipAddress: event.ipAddress,
    });
    return event;
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
      targetResourceType: r.targetResourceType,
      targetResourceId: r.targetResourceId,
      details: r.detailsJson as any,
      ipAddress: r.ipAddress || undefined,
      timestamp: r.createdAt.toISOString(),
    }));
  }

  async listAll(limit = 100): Promise<AuditEvent[]> {
    const rows = await db.select().from(schema.auditEvents).orderBy(desc(schema.auditEvents.createdAt)).limit(limit);
    return rows.map((r) => ({
      id: r.id,
      saasCustomerId: r.tenantId,
      actorUserId: r.actorUserId || undefined,
      actorType: r.actorType as any,
      action: r.action,
      targetResourceType: r.targetResourceType,
      targetResourceId: r.targetResourceId,
      details: r.detailsJson as any,
      ipAddress: r.ipAddress || undefined,
      timestamp: r.createdAt.toISOString(),
    }));
  }
}

export class SupportRepository implements ISupportRepository {
  async listTickets(tenantId: string): Promise<SupportTicket[]> {
    const rows = await db.select().from(schema.supportTickets).where(eq(schema.supportTickets.tenantId, tenantId)).orderBy(desc(schema.supportTickets.createdAt));
    return rows.map((t) => ({
      id: t.id,
      saasCustomerId: t.tenantId,
      createdByUserEmail: t.createdByUserEmail,
      subject: t.subject,
      status: t.status as any,
      priority: t.priority as any,
      assignedSupportAgentId: t.assignedSupportAgentId || undefined,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  async listAllTickets(): Promise<SupportTicket[]> {
    const rows = await db.select().from(schema.supportTickets).orderBy(desc(schema.supportTickets.createdAt));
    return rows.map((t) => ({
      id: t.id,
      saasCustomerId: t.tenantId,
      createdByUserEmail: t.createdByUserEmail,
      subject: t.subject,
      status: t.status as any,
      priority: t.priority as any,
      assignedSupportAgentId: t.assignedSupportAgentId || undefined,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  async getTicket(tenantId: string, ticketId: string): Promise<SupportTicket | null> {
    const rows = await db.select().from(schema.supportTickets).where(and(eq(schema.supportTickets.tenantId, tenantId), eq(schema.supportTickets.id, ticketId)));
    if (!rows.length) return null;
    const t = rows[0];
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

  async getTicketAdmin(ticketId: string): Promise<SupportTicket | null> {
    const rows = await db.select().from(schema.supportTickets).where(eq(schema.supportTickets.id, ticketId));
    if (!rows.length) return null;
    const t = rows[0];
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

  async createTicket(tenantId: string, email: string, subject: string, initialMessage: string): Promise<SupportTicket> {
    const id = `tkt_${Date.now()}`;
    await db.insert(schema.supportTickets).values({
      id,
      tenantId,
      createdByUserEmail: email,
      subject,
      status: 'OPEN',
      priority: 'MEDIUM',
    });
    await db.insert(schema.supportMessages).values({
      id: `msg_${Date.now()}`,
      tenantId,
      ticketId: id,
      senderType: 'SAAS_CUSTOMER',
      senderName: email,
      message: initialMessage,
    });
    return (await this.getTicket(tenantId, id))!;
  }

  async getMessages(tenantId: string, ticketId: string): Promise<SupportMessage[]> {
    const rows = await db
      .select()
      .from(schema.supportMessages)
      .where(and(eq(schema.supportMessages.tenantId, tenantId), eq(schema.supportMessages.ticketId, ticketId)))
      .orderBy(schema.supportMessages.createdAt);
    return rows.map((m) => ({
      id: m.id,
      saasCustomerId: m.tenantId,
      ticketId: m.ticketId,
      senderType: m.senderType as any,
      senderUserId: m.senderUserId || undefined,
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
    const id = `msg_${Date.now()}`;
    await db.insert(schema.supportMessages).values({
      id,
      tenantId,
      ticketId,
      senderType,
      senderName,
      message,
    });
    return {
      id,
      saasCustomerId: tenantId,
      ticketId,
      senderType,
      senderName,
      message,
      createdAt: new Date().toISOString(),
    };
  }

  async updateTicketStatus(tenantId: string, ticketId: string, status: string): Promise<SupportTicket | null> {
    await db
      .update(schema.supportTickets)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(schema.supportTickets.tenantId, tenantId), eq(schema.supportTickets.id, ticketId)));
    return this.getTicket(tenantId, ticketId);
  }
}

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
    const id = `ntf_${Date.now()}`;
    await db.insert(schema.notifications).values({
      id,
      tenantId: notification.saasCustomerId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      channel: notification.channel || 'IN_APP',
      linkUrl: notification.linkUrl,
    });
    return { ...notification, id, isRead: false, createdAt: new Date().toISOString() };
  }

  async markAsRead(tenantId: string, notificationId: string): Promise<void> {
    await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(and(eq(schema.notifications.tenantId, tenantId), eq(schema.notifications.id, notificationId)));
  }
}

export class IdempotencyRepository implements IIdempotencyRepository {
  async acquireKey(tenantId: string, key: string, operation: string, requestHash: string, ttlSeconds = 86400): Promise<boolean> {
    try {
      await db.insert(schema.idempotencyKeys).values({
        id: `idem_${tenantId}_${key}_${operation}`,
        tenantId,
        idempotencyKey: key,
        operation,
        requestHash,
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      });
      return true;
    } catch (err: any) {
      if (isUniqueConstraintError(err)) return false;
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
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      tenantId: r.tenantId,
      idempotencyKey: r.idempotencyKey,
      operation: r.operation,
      requestHash: r.requestHash,
      responseStatus: r.responseStatus || undefined,
      responseBody: r.responseBody as unknown,
      lockedAt: r.lockedAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
    };
  }

  async complete(tenantId: string, key: string, operation: string, responseStatus: number, responseBody: unknown): Promise<void> {
    await db
      .update(schema.idempotencyKeys)
      .set({ responseStatus, responseBody: responseBody as any })
      .where(
        and(
          eq(schema.idempotencyKeys.tenantId, tenantId),
          eq(schema.idempotencyKeys.idempotencyKey, key),
          eq(schema.idempotencyKeys.operation, operation)
        )
      );
  }
}

export class JobRecordRepository implements IJobRecordRepository {
  async createJob(job: Omit<JobRecord, 'id' | 'createdAt' | 'attemptCount' | 'status'>): Promise<JobRecord> {
    const id = `jobrec_${Date.now()}`;
    await db.insert(schema.jobRecords).values({
      id,
      tenantId: job.tenantId,
      jobId: job.jobId,
      entityId: job.entityId,
      operation: job.operation,
      attemptCount: 0,
      status: 'PENDING',
      payload: job.payload as any,
      idempotencyKey: job.idempotencyKey,
    });
    return {
      ...job,
      id,
      attemptCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
  }

  async getJob(jobId: string): Promise<JobRecord | null> {
    const rows = await db.select().from(schema.jobRecords).where(eq(schema.jobRecords.jobId, jobId));
    if (!rows.length) return null;
    const j = rows[0];
    return {
      id: j.id,
      tenantId: j.tenantId,
      jobId: j.jobId,
      entityId: j.entityId,
      operation: j.operation,
      attemptCount: j.attemptCount,
      status: j.status as any,
      lockedAt: j.lockedAt?.toISOString(),
      lockedBy: j.lockedBy || undefined,
      lastError: j.lastError || undefined,
      idempotencyKey: j.idempotencyKey || undefined,
      payload: j.payload as unknown,
      createdAt: j.createdAt.toISOString(),
    };
  }

  async updateJobStatus(jobId: string, status: JobRecord['status'], error?: string): Promise<void> {
    await db
      .update(schema.jobRecords)
      .set({ status, lastError: error, updatedAt: new Date() } as any)
      .where(eq(schema.jobRecords.jobId, jobId));
  }

  async lockJob(jobId: string, lockedBy: string): Promise<boolean> {
    const rows = await db
      .update(schema.jobRecords)
      .set({ status: 'RUNNING', lockedAt: new Date(), lockedBy })
      .where(and(eq(schema.jobRecords.jobId, jobId), eq(schema.jobRecords.status, 'PENDING')))
      .returning();
    return rows.length > 0;
  }

  async completeJob(jobId: string): Promise<void> {
    await db
      .update(schema.jobRecords)
      .set({ status: 'COMPLETED', completedAt: new Date(), finishedAt: new Date() })
      .where(eq(schema.jobRecords.jobId, jobId));
  }

  async failJob(jobId: string, error: string): Promise<void> {
    await db
      .update(schema.jobRecords)
      .set({ status: 'FAILED', lastError: error, failedAt: new Date(), finishedAt: new Date() })
      .where(eq(schema.jobRecords.jobId, jobId));
  }
}

export class OAuthStateRepository implements IOAuthStateRepository {
  async createState(tenantId: string, userId: string, state: string, ttlSeconds = 600): Promise<OAuthStateRecord> {
    const id = `oauth_${Date.now()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    await db.insert(schema.oauthStates).values({
      id,
      state,
      tenantId,
      userId,
      createdAt: now,
      expiresAt,
    });
    return { id, state, tenantId, userId, createdAt: now.toISOString(), expiresAt: expiresAt.toISOString() };
  }

  async validateAndConsumeState(state: string): Promise<OAuthStateRecord | null> {
    const rows = await db.select().from(schema.oauthStates).where(eq(schema.oauthStates.state, state));
    if (!rows.length) return null;
    const r = rows[0];
    if (r.consumedAt || r.expiresAt < new Date()) return null;
    await db.update(schema.oauthStates).set({ consumedAt: new Date() }).where(eq(schema.oauthStates.state, state));
    return {
      id: r.id,
      state: r.state,
      tenantId: r.tenantId,
      userId: r.userId,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      consumedAt: new Date().toISOString(),
    };
  }

  async getState(state: string): Promise<OAuthStateRecord | null> {
    const rows = await db.select().from(schema.oauthStates).where(eq(schema.oauthStates.state, state));
    if (!rows.length) return null;
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
