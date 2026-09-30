import type {
  User,
  SaaSCustomer,
  Business,
  BusinessLocation,
  GoogleConnection,
  Review,
  SupportTicket,
  SupportMessage,
  Subscription,
  UsageEvent,
  AuditEvent,
  SubscriptionStatus,
  TicketStatus,
  StarRating,
  ApprovalStatus,
  RiskLevel,
  ReplyDecisionAction,
} from '../../../shared/types/domain';
import type {
  TenantContext,
  IdempotencyRecord,
  SaaSCustomerFilter,
  SubscriptionFilter,
  SupportTicketFilter,
  ReviewFilter,
  LocationFilter,
} from '../../../shared/types/database';
import { dbStore, DatabaseStore } from './dbStore';
import { TenantGuard } from './tenantGuard';
import {
  EntityNotFoundError,
  DuplicateEntityError,
  InvalidOwnershipError,
} from './errors';

/**
 * Universal Idempotency Executor
 */
export async function executeIdempotent<T>(
  idempotencyKey: string | undefined,
  action: IdempotencyRecord['action'],
  tenantId: string,
  fn: () => Promise<T> | T,
  store: DatabaseStore = dbStore
): Promise<{ result: T; wasCached: boolean }> {
  if (idempotencyKey) {
    const cached = store.idempotencyStore.get(idempotencyKey);
    if (cached) {
      TenantGuard.assertTenantAccess({ saasCustomerId: tenantId }, cached.saasCustomerId, 'idempotent replay');
      return { result: cached.result as T, wasCached: true };
    }
  }

  const result = await fn();

  if (idempotencyKey) {
    const record: IdempotencyRecord<T> = {
      idempotencyKey,
      action,
      saasCustomerId: tenantId,
      result,
      createdAt: new Date().toISOString(),
    };
    store.idempotencyStore.set(idempotencyKey, record);
  }

  return { result, wasCached: false };
}

// ============================================================================
// 1. User Repository / Service
// ============================================================================
export class UserService {
  constructor(private store: DatabaseStore = dbStore) {}

  public create(user: Omit<User, 'createdAt'> & { createdAt?: string }): User {
    const now = new Date().toISOString();
    const newUser: User = {
      ...user,
      createdAt: user.createdAt || now,
      updatedAt: user.updatedAt || now,
    };
    this.store.users.set(newUser.id, newUser);
    return newUser;
  }

  public getById(id: string, context?: TenantContext): User | null {
    const user = this.store.users.get(id);
    if (!user) return null;
    if (context && user.saasCustomerId) {
      TenantGuard.assertTenantAccess(context, user.saasCustomerId, 'read user');
    }
    return user;
  }

  public getByEmail(email: string): User | null {
    const normalized = email.toLowerCase();
    for (const u of this.store.users.values()) {
      if (u.email.toLowerCase() === normalized) {
        return u;
      }
    }
    return null;
  }

  public updateLastLogin(id: string): User {
    const user = this.store.users.get(id);
    if (!user) throw new EntityNotFoundError('User', id);
    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    return user;
  }
}

// ============================================================================
// 2. SaaSCustomer Repository / Service
// ============================================================================
export class SaaSCustomerService {
  constructor(private store: DatabaseStore = dbStore) {}

  public create(
    customer: Omit<SaaSCustomer, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string },
    context?: TenantContext
  ): SaaSCustomer {
    if (context) {
      TenantGuard.assertAdminAccess(context, 'create new SaaSCustomer tenant');
    }

    const emailKey = (customer.email || customer.billingEmail || '').toLowerCase();
    if (this.store.saasCustomerByEmail.has(emailKey)) {
      throw new DuplicateEntityError('SaaSCustomer', 'email', emailKey);
    }

    const now = new Date().toISOString();
    const newCustomer: SaaSCustomer = {
      ...customer,
      name: customer.name || customer.businessName,
      billingEmail: customer.billingEmail || customer.email,
      createdAt: customer.createdAt || now,
      updatedAt: customer.updatedAt || now,
    };

    this.store.indexCustomer(newCustomer);
    return newCustomer;
  }

  public getById(id: string, context: TenantContext): SaaSCustomer {
    TenantGuard.assertTenantAccess(context, id, 'get SaaSCustomer by id');
    const customer = this.store.saasCustomers.get(id);
    if (!customer) {
      throw new EntityNotFoundError('SaaSCustomer', id);
    }
    return customer;
  }

  public getByEmail(email: string, context?: TenantContext): SaaSCustomer | null {
    const customerId = this.store.saasCustomerByEmail.get(email.toLowerCase());
    if (!customerId) return null;
    const customer = this.store.saasCustomers.get(customerId) || null;
    if (customer && context) {
      TenantGuard.assertTenantAccess(context, customer.id, 'get SaaSCustomer by email');
    }
    return customer;
  }

  public update(id: string, updates: Partial<SaaSCustomer>, context: TenantContext): SaaSCustomer {
    TenantGuard.assertTenantAccess(context, id, 'update SaaSCustomer');
    const customer = this.store.saasCustomers.get(id);
    if (!customer) throw new EntityNotFoundError('SaaSCustomer', id);

    const currentEmail = customer.email || customer.billingEmail || '';
    if (updates.email && updates.email.toLowerCase() !== currentEmail.toLowerCase()) {
      const newEmailKey = updates.email.toLowerCase();
      if (this.store.saasCustomerByEmail.has(newEmailKey)) {
        throw new DuplicateEntityError('SaaSCustomer', 'email', updates.email);
      }
      if (currentEmail) {
        this.store.saasCustomerByEmail.delete(currentEmail.toLowerCase());
      }
      this.store.saasCustomerByEmail.set(newEmailKey, id);
    }

    const updated: SaaSCustomer = {
      ...customer,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.store.saasCustomers.set(id, updated);
    return updated;
  }

  public listAll(context: TenantContext, filter?: SaaSCustomerFilter): SaaSCustomer[] {
    TenantGuard.assertAdminAccess(context, 'list all SaaSCustomers');
    let results = Array.from(this.store.saasCustomers.values());

    if (filter?.status) {
      results = results.filter((c) => c.status === filter.status);
    }
    if (filter?.email) {
      const match = this.getByEmail(filter.email, context);
      return match ? [match] : [];
    }

    // Sort by createdAt descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter?.limit) {
      const offset = filter.offset || 0;
      results = results.slice(offset, offset + filter.limit);
    }

    return results;
  }
}

// ============================================================================
// 3. Business Repository / Service
// ============================================================================
export class BusinessService {
  constructor(private store: DatabaseStore = dbStore) {}

  public create(
    business: Omit<Business, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string },
    context: TenantContext
  ): Business {
    TenantGuard.assertTenantAccess(context, business.saasCustomerId, 'create Business');
    const now = new Date().toISOString();
    const newBusiness: Business = {
      ...business,
      createdAt: business.createdAt || now,
      updatedAt: business.updatedAt || now,
    };
    this.store.businesses.set(newBusiness.id, newBusiness);
    return newBusiness;
  }

  public getById(id: string, context: TenantContext): Business {
    const business = this.store.businesses.get(id);
    if (!business) throw new EntityNotFoundError('Business', id);
    TenantGuard.assertTenantAccess(context, business.saasCustomerId, 'get Business');
    return business;
  }

  public listByTenant(context: TenantContext): Business[] {
    TenantGuard.assertTenantAccess(context, context.saasCustomerId, 'list Businesses');
    return Array.from(this.store.businesses.values()).filter(
      (b) => b.saasCustomerId === context.saasCustomerId
    );
  }
}

// ============================================================================
// 4. BusinessLocation Repository / Service
// ============================================================================
export class BusinessLocationService {
  constructor(private store: DatabaseStore = dbStore) {}

  public create(location: BusinessLocation, context: TenantContext): BusinessLocation {
    TenantGuard.assertTenantAccess(context, location.saasCustomerId, 'create BusinessLocation');
    // Enforce hierarchical ownership: businessId must belong to same tenant
    TenantGuard.validateLocationHierarchy(location.businessId, location.saasCustomerId, this.store);

    if (location.googleLocationId && this.store.businessLocationByGoogleLocationId.has(location.googleLocationId)) {
      throw new DuplicateEntityError('BusinessLocation', 'googleLocationId', location.googleLocationId);
    }

    const now = new Date().toISOString();
    const newLocation: BusinessLocation = {
      ...location,
      createdAt: location.createdAt || now,
      updatedAt: location.updatedAt || now,
    };

    this.store.indexLocation(newLocation);
    return newLocation;
  }

  public getById(id: string, context: TenantContext): BusinessLocation {
    const loc = this.store.businessLocations.get(id);
    if (!loc) throw new EntityNotFoundError('BusinessLocation', id);
    TenantGuard.assertTenantAccess(context, loc.saasCustomerId, 'get BusinessLocation');
    return loc;
  }

  public getByGoogleLocationId(googleLocationId: string, context: TenantContext): BusinessLocation | null {
    const locId = this.store.businessLocationByGoogleLocationId.get(googleLocationId);
    if (!locId) return null;
    const loc = this.store.businessLocations.get(locId) || null;
    if (loc) {
      TenantGuard.assertTenantAccess(context, loc.saasCustomerId, 'get BusinessLocation by googleLocationId');
    }
    return loc;
  }

  public updateLastSyncAt(id: string, lastSyncAt: string, context: TenantContext): BusinessLocation {
    const loc = this.getById(id, context);
    loc.lastSyncAt = lastSyncAt;
    loc.updatedAt = new Date().toISOString();
    return loc;
  }

  public listByTenant(context: TenantContext, filter?: LocationFilter): BusinessLocation[] {
    TenantGuard.assertTenantAccess(context, context.saasCustomerId, 'list BusinessLocations');
    let results = Array.from(this.store.businessLocations.values()).filter(
      (l) => l.saasCustomerId === context.saasCustomerId
    );

    if (filter?.businessId) {
      results = results.filter((l) => l.businessId === filter.businessId);
    }
    if (filter?.connectionStatus) {
      results = results.filter((l) => l.connectionStatus === filter.connectionStatus);
    }

    // Sort by lastSyncAt or createdAt
    if (filter?.sortBy === 'lastSyncAt') {
      results.sort((a, b) => {
        const timeA = a.lastSyncAt ? new Date(a.lastSyncAt).getTime() : 0;
        const timeB = b.lastSyncAt ? new Date(b.lastSyncAt).getTime() : 0;
        return filter.sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      });
    } else {
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (filter?.limit) {
      const offset = filter.offset || 0;
      results = results.slice(offset, offset + filter.limit);
    }

    return results;
  }
}

// ============================================================================
// 5. GoogleConnection Repository / Service
// ============================================================================
export class GoogleConnectionService {
  constructor(private store: DatabaseStore = dbStore) {}

  public upsert(conn: GoogleConnection, context: TenantContext): GoogleConnection {
    TenantGuard.assertTenantAccess(context, conn.saasCustomerId, 'upsert GoogleConnection');
    const now = new Date().toISOString();
    const connection: GoogleConnection = {
      ...conn,
      createdAt: conn.createdAt || now,
      updatedAt: now,
    };
    this.store.googleConnections.set(connection.id, connection);
    return connection;
  }

  public getByTenant(context: TenantContext): GoogleConnection | null {
    TenantGuard.assertTenantAccess(context, context.saasCustomerId, 'get GoogleConnection');
    for (const c of this.store.googleConnections.values()) {
      if (c.saasCustomerId === context.saasCustomerId) {
        return c;
      }
    }
    return null;
  }
}

// ============================================================================
// 6. Review Repository & Idempotent Ingestion Service
// ============================================================================
export class ReviewService {
  constructor(private store: DatabaseStore = dbStore) {}

  /**
   * Idempotent Review Import
   * Prevents duplicate review ingestion based on providerReviewId and optional idempotencyKey.
   */
  public async importReviewIdempotent(
    reviewData: {
      id?: string;
      businessLocationId: string;
      provider: 'GOOGLE';
      providerReviewId: string;
      rating: StarRating;
      authorName: string;
      reviewText?: string;
      reviewCreatedAt: string;
      replyText?: string;
      replyStatus?: ApprovalStatus;
      sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
      riskLevel?: RiskLevel;
      suggestedAction?: ReplyDecisionAction;
    },
    context: TenantContext,
    idempotencyKey?: string
  ): Promise<{ review: Review; isDuplicate: boolean }> {
    const location = this.store.businessLocations.get(reviewData.businessLocationId);
    if (!location) {
      throw new InvalidOwnershipError(`Referenced BusinessLocation "${reviewData.businessLocationId}" does not exist`);
    }

    TenantGuard.assertTenantAccess(context, location.saasCustomerId, 'import Review');

    const providerKey = `${reviewData.provider || 'GOOGLE'}:${reviewData.providerReviewId}`;
    const existingReviewId = this.store.reviewByProviderReviewId.get(providerKey);

    if (existingReviewId) {
      const existing = this.store.reviews.get(existingReviewId)!;
      return { review: existing, isDuplicate: true };
    }

    return executeIdempotent(
      idempotencyKey,
      'IMPORT_REVIEW',
      location.saasCustomerId,
      () => {
        const now = new Date().toISOString();
        const review: Review = {
          ...reviewData,
          id: reviewData.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          saasCustomerId: location.saasCustomerId,
          comment: reviewData.reviewText,
          starRating: reviewData.rating,
          author: {
            displayName: reviewData.authorName,
            isAnonymous: false,
          },
          googleReviewId: reviewData.providerReviewId,
          googleReviewName: `locations/${location.googleLocationId}/reviews/${reviewData.providerReviewId}`,
          createdAt: now,
          updatedAt: now,
        };

        this.store.indexReview(review, location.saasCustomerId);
        return { review, isDuplicate: false };
      },
      this.store
    ).then((res) => res.result);
  }

  public getById(id: string, context: TenantContext): Review {
    const review = this.store.reviews.get(id);
    if (!review) throw new EntityNotFoundError('Review', id);
    const tenantId = review.saasCustomerId || TenantGuard.resolveTenantOwnership('Review', review, this.store);
    TenantGuard.assertTenantAccess(context, tenantId, 'get Review');
    return review;
  }

  public getByProviderReviewId(provider: string, providerReviewId: string, context: TenantContext): Review | null {
    const key = `${provider}:${providerReviewId}`;
    const id = this.store.reviewByProviderReviewId.get(key);
    if (!id) return null;
    return this.getById(id, context);
  }

  public listByTenant(context: TenantContext, filter?: ReviewFilter): Review[] {
    TenantGuard.assertTenantAccess(context, context.saasCustomerId, 'list Reviews');
    let results: Review[] = [];

    if (filter?.businessLocationId) {
      const locReviewIds = this.store.reviewsByLocationId.get(filter.businessLocationId) || new Set();
      for (const id of locReviewIds) {
        const r = this.store.reviews.get(id);
        if (r) results.push(r);
      }
    } else {
      results = Array.from(this.store.reviews.values()).filter((r) => {
        const tenantId = r.saasCustomerId || TenantGuard.resolveTenantOwnership('Review', r, this.store);
        return tenantId === context.saasCustomerId;
      });
    }

    if (filter?.rating) {
      results = results.filter((r) => (r.rating || r.starRating) === filter.rating);
    }
    if (filter?.riskLevel) {
      results = results.filter((r) => r.riskLevel === filter.riskLevel);
    }
    if (filter?.replyStatus) {
      results = results.filter((r) => (r.replyStatus || r.reply?.status) === filter.replyStatus);
    }

    // Sort by reviewCreatedAt or createdAt descending
    results.sort((a, b) => new Date(b.reviewCreatedAt || b.createdAt).getTime() - new Date(a.reviewCreatedAt || a.createdAt).getTime());

    if (filter?.limit) {
      const offset = filter.offset || 0;
      results = results.slice(offset, offset + filter.limit);
    }

    return results;
  }
}

// ============================================================================
// 7. Support Ticket & Message Repository / Service
// ============================================================================
export class SupportService {
  constructor(private store: DatabaseStore = dbStore) {}

  public createTicket(
    ticket: Omit<SupportTicket, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string },
    context: TenantContext
  ): SupportTicket {
    TenantGuard.assertTenantAccess(context, ticket.saasCustomerId, 'create SupportTicket');
    const now = new Date().toISOString();
    const newTicket: SupportTicket = {
      ...ticket,
      createdAt: ticket.createdAt || now,
      updatedAt: ticket.updatedAt || now,
    };
    this.store.indexSupportTicket(newTicket);
    return newTicket;
  }

  public getTicketById(id: string, context: TenantContext): SupportTicket {
    const ticket = this.store.supportTickets.get(id);
    if (!ticket) throw new EntityNotFoundError('SupportTicket', id);
    TenantGuard.assertTenantAccess(context, ticket.saasCustomerId, 'get SupportTicket');
    return ticket;
  }

  public listTicketsByTenant(context: TenantContext, filter?: SupportTicketFilter): SupportTicket[] {
    TenantGuard.assertTenantAccess(context, context.saasCustomerId, 'list SupportTickets');
    let results = Array.from(this.store.supportTickets.values()).filter(
      (t) => t.saasCustomerId === context.saasCustomerId
    );

    if (filter?.status) {
      results = results.filter((t) => t.status === filter.status);
    }
    if (filter?.priority) {
      results = results.filter((t) => t.priority === filter.priority);
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter?.limit) {
      const offset = filter.offset || 0;
      results = results.slice(offset, offset + filter.limit);
    }

    return results;
  }

  public listTicketsByStatus(status: TicketStatus, context: TenantContext): SupportTicket[] {
    // If admin, return across all tenants; otherwise scoped to tenant
    const isAdmin = context.isSuperAdmin || context.role === 'SUPER_ADMIN';
    const ticketIds = this.store.supportTicketByStatus.get(status) || new Set();
    const tickets: SupportTicket[] = [];

    for (const id of ticketIds) {
      const t = this.store.supportTickets.get(id);
      if (t && (isAdmin || t.saasCustomerId === context.saasCustomerId)) {
        tickets.push(t);
      }
    }

    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return tickets;
  }

  public addMessage(
    message: Omit<SupportMessage, 'createdAt'> & { createdAt?: string },
    context: TenantContext
  ): SupportMessage {
    const ticketId = message.supportTicketId || message.ticketId || '';
    const ticket = this.getTicketById(ticketId, context);
    TenantGuard.assertTenantAccess(context, ticket.saasCustomerId, 'add SupportMessage');

    const now = new Date().toISOString();
    const newMsg: SupportMessage = {
      ...message,
      createdAt: message.createdAt || now,
    };

    this.store.supportMessages.set(newMsg.id, newMsg);

    let msgSet = this.store.supportMessagesByTicketId.get(ticket.id);
    if (!msgSet) {
      msgSet = new Set<string>();
      this.store.supportMessagesByTicketId.set(ticket.id, msgSet);
    }
    msgSet.add(newMsg.id);

    ticket.updatedAt = now;
    return newMsg;
  }

  public listMessagesByTicket(ticketId: string, context: TenantContext): SupportMessage[] {
    const ticket = this.getTicketById(ticketId, context);
    TenantGuard.assertTenantAccess(context, ticket.saasCustomerId, 'list SupportMessages');

    const msgIds = this.store.supportMessagesByTicketId.get(ticketId) || new Set();
    const messages: SupportMessage[] = [];
    for (const id of msgIds) {
      const m = this.store.supportMessages.get(id);
      if (m) messages.push(m);
    }

    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return messages;
  }
}

// ============================================================================
// 8. Subscription Repository / Service
// ============================================================================
export class SubscriptionService {
  constructor(private store: DatabaseStore = dbStore) {}

  public upsert(sub: Subscription, context?: TenantContext): Subscription {
    if (context) {
      TenantGuard.assertTenantAccess(context, sub.saasCustomerId, 'upsert Subscription');
    }
    const now = new Date().toISOString();
    const subscription: Subscription = {
      ...sub,
      createdAt: sub.createdAt || now,
      updatedAt: now,
    };
    this.store.indexSubscription(subscription);
    return subscription;
  }

  public getByTenant(context: TenantContext): Subscription | null {
    TenantGuard.assertTenantAccess(context, context.saasCustomerId, 'get Subscription');
    for (const s of this.store.subscriptions.values()) {
      if (s.saasCustomerId === context.saasCustomerId) {
        return s;
      }
    }
    return null;
  }

  public listByStatus(status: SubscriptionStatus, context: TenantContext): Subscription[] {
    TenantGuard.assertAdminAccess(context, 'list Subscriptions by status');
    const subIds = this.store.subscriptionByStatus.get(status) || new Set();
    const results: Subscription[] = [];
    for (const id of subIds) {
      const s = this.store.subscriptions.get(id);
      if (s) results.push(s);
    }
    return results;
  }
}

// ============================================================================
// 9. Usage & Audit Events
// ============================================================================
export class EventService {
  constructor(private store: DatabaseStore = dbStore) {}

  public recordUsage(
    event: Omit<UsageEvent, 'createdAt'> & { createdAt?: string },
    context: TenantContext
  ): UsageEvent {
    TenantGuard.assertTenantAccess(context, event.saasCustomerId, 'record UsageEvent');
    const newEvent: UsageEvent = {
      ...event,
      createdAt: event.createdAt || new Date().toISOString(),
    };
    this.store.usageEvents.set(newEvent.id, newEvent);
    return newEvent;
  }

  public recordAudit(
    event: Omit<AuditEvent, 'createdAt'> & { createdAt?: string },
    context?: TenantContext
  ): AuditEvent {
    if (context) {
      TenantGuard.assertTenantAccess(context, event.saasCustomerId, 'record AuditEvent');
    }
    const newEvent: AuditEvent = {
      ...event,
      createdAt: event.createdAt || new Date().toISOString(),
    };
    this.store.auditEvents.set(newEvent.id, newEvent);
    return newEvent;
  }

  public listAuditEvents(context: TenantContext): AuditEvent[] {
    TenantGuard.assertTenantAccess(context, context.saasCustomerId, 'list AuditEvents');
    return Array.from(this.store.auditEvents.values())
      .filter((e) => e.saasCustomerId === context.saasCustomerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// Consolidated Data Access Services Singleton
export const userService = new UserService();
export const saasCustomerService = new SaaSCustomerService();
export const businessService = new BusinessService();
export const businessLocationService = new BusinessLocationService();
export const googleConnectionService = new GoogleConnectionService();
export const reviewService = new ReviewService();
export const supportService = new SupportService();
export const subscriptionService = new SubscriptionService();
export const eventService = new EventService();
