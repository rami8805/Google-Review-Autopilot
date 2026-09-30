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
} from '../../../shared/types/domain';
import type { IdempotencyRecord } from '../../../shared/types/database';

/**
 * Unified single persistence database engine with indexes for high performance
 * and strict tenant isolation.
 */
export class DatabaseStore {
  // Primary Entity Collections
  public users = new Map<string, User>();
  public saasCustomers = new Map<string, SaaSCustomer>();
  public businesses = new Map<string, Business>();
  public businessLocations = new Map<string, BusinessLocation>();
  public googleConnections = new Map<string, GoogleConnection>();
  public reviews = new Map<string, Review>();
  public supportTickets = new Map<string, SupportTicket>();
  public supportMessages = new Map<string, SupportMessage>();
  public subscriptions = new Map<string, Subscription>();
  public usageEvents = new Map<string, UsageEvent>();
  public auditEvents = new Map<string, AuditEvent>();

  // Required Indexes
  // 1. SaaSCustomer email index (email.toLowerCase() -> customerId)
  public saasCustomerByEmail = new Map<string, string>();

  // 2. Subscription status index (status -> Set of subscriptionIds)
  public subscriptionByStatus = new Map<SubscriptionStatus, Set<string>>();

  // 3. Support ticket status index (status -> Set of ticketIds)
  public supportTicketByStatus = new Map<TicketStatus, Set<string>>();

  // 4. Review providerReviewId index (`${provider}:${providerReviewId}` -> reviewId)
  public reviewByProviderReviewId = new Map<string, string>();

  // 5. BusinessLocation googleLocationId index (googleLocationId -> locationId)
  public businessLocationByGoogleLocationId = new Map<string, string>();

  // 6. BusinessLocation by Business index (businessId -> Set of locationIds)
  public businessLocationByBusinessId = new Map<string, Set<string>>();

  // 7. Multi-tenant entity membership index (saasCustomerId -> entityType -> Set of IDs)
  public entitiesByTenant = new Map<string, Map<string, Set<string>>>();

  // 8. Support message by ticket index (ticketId -> Set of messageIds)
  public supportMessagesByTicketId = new Map<string, Set<string>>();

  // 9. Reviews by location index (businessLocationId -> Set of reviewIds)
  public reviewsByLocationId = new Map<string, Set<string>>();

  // 10. Idempotency store (idempotencyKey -> IdempotencyRecord)
  public idempotencyStore = new Map<string, IdempotencyRecord>();

  // =========================================================================
  // Index Maintenance Helpers
  // =========================================================================

  private registerTenantEntity(tenantId: string, entityType: string, entityId: string): void {
    if (!tenantId) return;
    let tenantMap = this.entitiesByTenant.get(tenantId);
    if (!tenantMap) {
      tenantMap = new Map<string, Set<string>>();
      this.entitiesByTenant.set(tenantId, tenantMap);
    }
    let idSet = tenantMap.get(entityType);
    if (!idSet) {
      idSet = new Set<string>();
      tenantMap.set(entityType, idSet);
    }
    idSet.add(entityId);
  }

  private unregisterTenantEntity(tenantId: string, entityType: string, entityId: string): void {
    if (!tenantId) return;
    const tenantMap = this.entitiesByTenant.get(tenantId);
    if (tenantMap) {
      const idSet = tenantMap.get(entityType);
      if (idSet) {
        idSet.delete(entityId);
      }
    }
  }

  // --- SaaSCustomer Indexing ---
  public indexCustomer(customer: SaaSCustomer): void {
    this.saasCustomers.set(customer.id, customer);
    const emailKey = (customer.email || customer.billingEmail || '').toLowerCase();
    if (emailKey) {
      this.saasCustomerByEmail.set(emailKey, customer.id);
    }
    this.registerTenantEntity(customer.id, 'SaaSCustomer', customer.id);
  }

  public unindexCustomer(id: string): void {
    const customer = this.saasCustomers.get(id);
    if (customer) {
      const emailKey = (customer.email || customer.billingEmail || '').toLowerCase();
      if (emailKey) {
        this.saasCustomerByEmail.delete(emailKey);
      }
      this.unregisterTenantEntity(customer.id, 'SaaSCustomer', customer.id);
      this.saasCustomers.delete(id);
    }
  }

  // --- Subscription Indexing ---
  public indexSubscription(subscription: Subscription): void {
    this.subscriptions.set(subscription.id, subscription);
    let statusSet = this.subscriptionByStatus.get(subscription.status);
    if (!statusSet) {
      statusSet = new Set<string>();
      this.subscriptionByStatus.set(subscription.status, statusSet);
    }
    statusSet.add(subscription.id);
    this.registerTenantEntity(subscription.saasCustomerId, 'Subscription', subscription.id);
  }

  public unindexSubscription(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      const statusSet = this.subscriptionByStatus.get(subscription.status);
      if (statusSet) {
        statusSet.delete(id);
      }
      this.unregisterTenantEntity(subscription.saasCustomerId, 'Subscription', subscription.id);
      this.subscriptions.delete(id);
    }
  }

  // --- SupportTicket Indexing ---
  public indexSupportTicket(ticket: SupportTicket): void {
    this.supportTickets.set(ticket.id, ticket);
    let statusSet = this.supportTicketByStatus.get(ticket.status);
    if (!statusSet) {
      statusSet = new Set<string>();
      this.supportTicketByStatus.set(ticket.status, statusSet);
    }
    statusSet.add(ticket.id);
    this.registerTenantEntity(ticket.saasCustomerId, 'SupportTicket', ticket.id);
  }

  public unindexSupportTicket(id: string): void {
    const ticket = this.supportTickets.get(id);
    if (ticket) {
      const statusSet = this.supportTicketByStatus.get(ticket.status);
      if (statusSet) {
        statusSet.delete(id);
      }
      this.unregisterTenantEntity(ticket.saasCustomerId, 'SupportTicket', ticket.id);
      this.supportTickets.delete(id);
    }
  }

  // --- Review Indexing ---
  public indexReview(review: Review, tenantId: string): void {
    this.reviews.set(review.id, review);
    const providerKey = `${review.provider || 'GOOGLE'}:${review.providerReviewId || review.googleReviewId}`;
    this.reviewByProviderReviewId.set(providerKey, review.id);

    let locSet = this.reviewsByLocationId.get(review.businessLocationId);
    if (!locSet) {
      locSet = new Set<string>();
      this.reviewsByLocationId.set(review.businessLocationId, locSet);
    }
    locSet.add(review.id);

    this.registerTenantEntity(tenantId, 'Review', review.id);
  }

  public unindexReview(id: string, tenantId: string): void {
    const review = this.reviews.get(id);
    if (review) {
      const providerKey = `${review.provider || 'GOOGLE'}:${review.providerReviewId || review.googleReviewId}`;
      this.reviewByProviderReviewId.delete(providerKey);
      const locSet = this.reviewsByLocationId.get(review.businessLocationId);
      if (locSet) {
        locSet.delete(id);
      }
      this.unregisterTenantEntity(tenantId, 'Review', id);
      this.reviews.delete(id);
    }
  }

  // --- Business Location Indexing ---
  public indexLocation(location: BusinessLocation): void {
    this.businessLocations.set(location.id, location);
    if (location.googleLocationId) {
      this.businessLocationByGoogleLocationId.set(location.googleLocationId, location.id);
    }
    let busSet = this.businessLocationByBusinessId.get(location.businessId);
    if (!busSet) {
      busSet = new Set<string>();
      this.businessLocationByBusinessId.set(location.businessId, busSet);
    }
    busSet.add(location.id);

    this.registerTenantEntity(location.saasCustomerId, 'BusinessLocation', location.id);
  }

  public unindexLocation(id: string): void {
    const location = this.businessLocations.get(id);
    if (location) {
      if (location.googleLocationId) {
        this.businessLocationByGoogleLocationId.delete(location.googleLocationId);
      }
      const busSet = this.businessLocationByBusinessId.get(location.businessId);
      if (busSet) {
        busSet.delete(id);
      }
      this.unregisterTenantEntity(location.saasCustomerId, 'BusinessLocation', id);
      this.businessLocations.delete(id);
    }
  }

  // --- Reset helper for clean testing ---
  public clearAll(): void {
    this.users.clear();
    this.saasCustomers.clear();
    this.businesses.clear();
    this.businessLocations.clear();
    this.googleConnections.clear();
    this.reviews.clear();
    this.supportTickets.clear();
    this.supportMessages.clear();
    this.subscriptions.clear();
    this.usageEvents.clear();
    this.auditEvents.clear();

    this.saasCustomerByEmail.clear();
    this.subscriptionByStatus.clear();
    this.supportTicketByStatus.clear();
    this.reviewByProviderReviewId.clear();
    this.businessLocationByGoogleLocationId.clear();
    this.businessLocationByBusinessId.clear();
    this.entitiesByTenant.clear();
    this.supportMessagesByTicketId.clear();
    this.reviewsByLocationId.clear();
    this.idempotencyStore.clear();
  }
}

// Global Singleton Instance
export const dbStore = new DatabaseStore();
