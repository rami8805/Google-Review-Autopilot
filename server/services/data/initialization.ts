import { dbStore, DatabaseStore } from './dbStore';
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
  AuditEvent,
} from '../../../shared/types/domain';

/**
 * Database Initialization & Seed Logic
 * Sets up initial platform tenants, locations, subscriptions, and reviews
 * with full index population.
 */
export function initializeDatabase(store: DatabaseStore = dbStore): void {
  // Guard against re-initializing if already populated
  if (store.saasCustomers.size > 0) {
    return;
  }

  const now = new Date().toISOString();
  const demoCustomerId = 'saas_cust_demo_01';
  const ownerUserId = 'usr_demo_01';
  const superAdminUserId = 'usr_super_admin';

  // 1. Seed Users
  const ownerUser: User = {
    id: ownerUserId,
    email: 'owner@downtowndental-sf.com',
    name: 'Dr. Sarah Lin',
    role: 'OWNER',
    saasCustomerId: demoCustomerId,
    emailVerified: true,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    lastLoginAt: now,
  };
  store.users.set(ownerUser.id, ownerUser);

  const superAdminUser: User = {
    id: superAdminUserId,
    email: 'admin@autopilot.local',
    name: 'Autopilot Super Admin',
    role: 'SUPER_ADMIN',
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: now,
  };
  store.users.set(superAdminUser.id, superAdminUser);

  // 2. Seed SaaSCustomer
  const demoCustomer: SaaSCustomer = {
    id: demoCustomerId,
    ownerUserId: ownerUser.id,
    businessName: 'Downtown Dental SF',
    contactName: 'Dr. Sarah Lin',
    email: 'owner@downtowndental-sf.com',
    billingEmail: 'billing@downtowndental-sf.com',
    phone: '+1-415-555-0199',
    industry: 'Healthcare / Dental',
    status: 'ACTIVE',
    notes: 'Premier single-location beta dental practice',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
  };
  store.indexCustomer(demoCustomer);

  // 3. Seed Business
  const demoBusiness: Business = {
    id: 'biz_001',
    saasCustomerId: demoCustomerId,
    name: 'Downtown Dental Practice',
    category: 'Dentist',
    timezone: 'America/Los_Angeles',
    websiteUrl: 'https://downtowndental-sf.com',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
  };
  store.businesses.set(demoBusiness.id, demoBusiness);

  // 4. Seed BusinessLocation
  const demoLocation: BusinessLocation = {
    id: 'loc_001',
    businessId: demoBusiness.id,
    saasCustomerId: demoCustomerId,
    googleAccountId: 'accounts/101',
    googleLocationId: 'locations/1089274910284',
    displayName: 'Downtown Dental Practice',
    locationName: 'Downtown Dental Practice',
    address: {
      addressLines: ['104 Market Street', 'Suite 200'],
      locality: 'San Francisco',
      administrativeArea: 'CA',
      postalCode: '94103',
      country: 'US',
    },
    timezone: 'America/Los_Angeles',
    connectionStatus: 'CONNECTED',
    lastSyncAt: now,
    primaryPhone: '+1-415-555-0199',
    primaryCategory: 'Dentist',
    isConnected: true,
    automationEnabled: true,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: now,
  };
  store.indexLocation(demoLocation);

  // 5. Seed GoogleConnection
  const demoConnection: GoogleConnection = {
    id: 'conn_001',
    saasCustomerId: demoCustomerId,
    provider: 'GOOGLE_BUSINESS_PROFILE',
    encryptedTokenReference: 'vault:token:enc_google_demo_01',
    scopes: ['https://www.googleapis.com/auth/business.manage'],
    status: 'CONNECTED',
    expiresAt: new Date(Date.now() + 3600000 * 24).toISOString(),
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: now,
    lastSyncedAt: now,
  };
  store.googleConnections.set(demoConnection.id, demoConnection);

  // 6. Seed Subscription
  const demoSubscription: Subscription = {
    id: 'sub_demo_01',
    saasCustomerId: demoCustomerId,
    plan: 'STARTER',
    status: 'ACTIVE',
    providerCustomerId: 'cus_stripe_demo_01',
    providerSubscriptionId: 'sub_stripe_demo_01',
    currentPeriodStart: now,
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    locationLimit: 1,
    monthlyReplyLimit: 50,
    createdAt: now,
    updatedAt: now,
  };
  store.indexSubscription(demoSubscription);

  // 7. Seed Reviews
  const rev1: Review = {
    id: 'rev_001',
    businessLocationId: demoLocation.id,
    saasCustomerId: demoCustomerId,
    googleReviewId: 'google_rev_101',
    googleReviewName: 'accounts/101/locations/loc_001/reviews/google_rev_101',
    provider: 'GOOGLE',
    providerReviewId: 'google_rev_101',
    author: {
      displayName: 'Emily Rodriguez',
      isAnonymous: false,
    },
    rating: 5,
    starRating: 5,
    authorName: 'Emily Rodriguez',
    reviewText: 'Dr. Sarah and the hygienists are the best in SF! Extremely gentle cleaning and spotless clinic.',
    comment: 'Dr. Sarah and the hygienists are the best in SF! Extremely gentle cleaning and spotless clinic.',
    reviewCreatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    replyText: 'Hi Emily, thank you so much for the 5-star review! Dr. Sarah and the whole team are thrilled to hear your cleaning went so smoothly. See you at your next visit!',
    replyStatus: 'AUTO_PUBLISHED',
    sentiment: 'POSITIVE',
    riskLevel: 'LOW',
    suggestedAction: 'AUTO_PUBLISH',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: now,
  };
  store.indexReview(rev1, demoCustomerId);

  const rev2: Review = {
    id: 'rev_002',
    businessLocationId: demoLocation.id,
    saasCustomerId: demoCustomerId,
    googleReviewId: 'google_rev_102',
    googleReviewName: 'accounts/101/locations/loc_001/reviews/google_rev_102',
    provider: 'GOOGLE',
    providerReviewId: 'google_rev_102',
    author: {
      displayName: 'Michael Chang',
      isAnonymous: false,
    },
    rating: 3,
    starRating: 3,
    authorName: 'Michael Chang',
    reviewText: 'The dental work was fine, but wait time was 35 minutes past my appointment time. Reception was disorganized.',
    comment: 'The dental work was fine, but wait time was 35 minutes past my appointment time. Reception was disorganized.',
    reviewCreatedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    replyText: 'Hello Michael, thank you for your candid feedback. While we are glad the dental care was solid, we apologize for the wait you experienced. We strive to stay on schedule and are reviewing our morning booking flow. Please contact care@downtowndental-sf.com if we can assist further.',
    replyStatus: 'PENDING_APPROVAL',
    sentiment: 'NEUTRAL',
    riskLevel: 'MEDIUM',
    suggestedAction: 'REQUIRE_APPROVAL',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    updatedAt: now,
  };
  store.indexReview(rev2, demoCustomerId);

  // 8. Seed Support Ticket & Message
  const ticket1: SupportTicket = {
    id: 'ticket_001',
    saasCustomerId: demoCustomerId,
    subject: 'Question regarding Google OAuth token refresh schedule',
    category: 'GOOGLE_INTEGRATION',
    priority: 'MEDIUM',
    status: 'OPEN',
    assignedAdminId: superAdminUserId,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: now,
  };
  store.indexSupportTicket(ticket1);

  const msg1: SupportMessage = {
    id: 'msg_001',
    supportTicketId: ticket1.id,
    senderType: 'SAAS_CUSTOMER',
    senderId: ownerUserId,
    body: 'Hi support team, how often does Google Review Autopilot refresh the location reviews token?',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  };
  store.supportMessages.set(msg1.id, msg1);
  let msgSet = store.supportMessagesByTicketId.get(ticket1.id);
  if (!msgSet) {
    msgSet = new Set<string>();
    store.supportMessagesByTicketId.set(ticket1.id, msgSet);
  }
  msgSet.add(msg1.id);

  // 9. Seed Audit Event
  const audit1: AuditEvent = {
    id: 'audit_001',
    saasCustomerId: demoCustomerId,
    actorType: 'USER',
    actorId: ownerUserId,
    eventType: 'LOCATION_CONNECTED',
    metadata: { locationId: demoLocation.id, googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4' },
    createdAt: '2026-01-15T00:05:00.000Z',
  };
  store.auditEvents.set(audit1.id, audit1);
}

// Auto-initialize default seed data upon module load
initializeDatabase();
