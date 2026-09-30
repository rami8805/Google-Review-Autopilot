import type {
  SaaSCustomer,
  Business,
  BusinessLocation,
  Subscription,
  Review,
  AuditEvent,
  CustomerNote,
  CustomerOverviewDetail,
  PlatformMetrics,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../../shared/types/domain';

export const PLAN_MRR: Record<SubscriptionPlan, number> = {
  STARTER: 49,
  GROWTH: 99,
  PRO: 199,
  ENTERPRISE: 499,
};

export interface CustomerFilterOptions {
  search?: string;
  plan?: string;
  status?: string;
  connectionStatus?: 'HEALTHY' | 'FAILED' | 'ALL';
  sortBy?: 'mrr' | 'reviews' | 'lastActivity' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export class CustomerManagementService {
  private customers: SaaSCustomer[] = [];
  private businesses: Record<string, Business> = {};
  private locations: Record<string, BusinessLocation[]> = {};
  private subscriptions: Record<string, Subscription> = {};
  private notes: Record<string, CustomerNote[]> = {};
  private auditEvents: AuditEvent[] = [];
  private reviewsByCustomer: Record<string, Review[]> = {};

  constructor() {
    this.seedInitialTenants();
  }

  private seedInitialTenants() {
    // 1. Downtown Dental SF (Primary Demo Tenant - Active / Healthy)
    const cust1: SaaSCustomer = {
      id: 'saas_cust_demo_01',
      name: 'Downtown Dental SF',
      billingEmail: 'billing@downtowndental-sf.com',
      subscriptionId: 'sub_001',
      status: 'ACTIVE',
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-09-20T14:30:00Z',
    };
    this.customers.push(cust1);
    this.businesses[cust1.id] = {
      id: 'biz_001',
      saasCustomerId: cust1.id,
      name: 'Downtown Dental Practice',
      industryCategory: 'Healthcare / Dental',
      websiteUrl: 'https://downtowndental-sf.example.com',
      createdAt: cust1.createdAt,
      updatedAt: cust1.updatedAt,
    };
    this.locations[cust1.id] = [
      {
        id: 'loc_001',
        businessId: 'biz_001',
        saasCustomerId: cust1.id,
        googleLocationId: 'locations/1089274910284',
        googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        locationName: 'Downtown Dental Practice - Financial District',
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
        createdAt: cust1.createdAt,
        updatedAt: cust1.updatedAt,
      },
    ];
    this.subscriptions[cust1.id] = {
      id: 'sub_001',
      saasCustomerId: cust1.id,
      plan: 'STARTER',
      status: 'ACTIVE',
      currentPeriodStart: '2026-09-01T00:00:00Z',
      currentPeriodEnd: '2026-10-01T00:00:00Z',
      cancelAtPeriodEnd: false,
      locationLimit: 1,
      monthlyReplyLimit: 50,
      stripeCustomerId: 'cus_downtown_01',
      stripeSubscriptionId: 'sub_stripe_01',
      createdAt: cust1.createdAt,
      updatedAt: cust1.updatedAt,
    };
    this.notes[cust1.id] = [
      {
        id: 'note_001',
        saasCustomerId: cust1.id,
        authorAdminId: 'admin_usr_01',
        authorAdminName: 'Sarah Platform Lead',
        note: 'Customer had a slight concern about 3-star review grace periods in February. Explained safety intercept rules. Very satisfied with current automated reply rate.',
        createdAt: '2026-02-18T11:20:00Z',
        updatedAt: '2026-02-18T11:20:00Z',
      },
    ];

    // 2. Golden Gate Auto Repair (Growth Plan - Active)
    const cust2: SaaSCustomer = {
      id: 'saas_cust_demo_02',
      name: 'Golden Gate Auto Repair',
      billingEmail: 'service@goldengateauto.example.com',
      subscriptionId: 'sub_002',
      status: 'ACTIVE',
      createdAt: '2026-02-10T08:00:00Z',
      updatedAt: '2026-09-25T16:00:00Z',
    };
    this.customers.push(cust2);
    this.businesses[cust2.id] = {
      id: 'biz_002',
      saasCustomerId: cust2.id,
      name: 'Golden Gate Auto Group',
      industryCategory: 'Automotive / Service & Repair',
      websiteUrl: 'https://goldengateauto.example.com',
      createdAt: cust2.createdAt,
      updatedAt: cust2.updatedAt,
    };
    this.locations[cust2.id] = [
      {
        id: 'loc_002a',
        businessId: 'biz_002',
        saasCustomerId: cust2.id,
        googleLocationId: 'locations/1089274910285',
        googlePlaceId: 'ChIJG_auto_mission_sf',
        locationName: 'Golden Gate Auto - Mission District',
        address: {
          addressLines: ['2450 Mission Street'],
          locality: 'San Francisco',
          administrativeArea: 'CA',
          postalCode: '94110',
          country: 'US',
        },
        primaryPhone: '+1-415-555-0811',
        primaryCategory: 'Auto Repair Shop',
        isConnected: true,
        automationEnabled: true,
        createdAt: cust2.createdAt,
        updatedAt: cust2.updatedAt,
      },
      {
        id: 'loc_002b',
        businessId: 'biz_002',
        saasCustomerId: cust2.id,
        googleLocationId: 'locations/1089274910286',
        googlePlaceId: 'ChIJG_auto_sunset_sf',
        locationName: 'Golden Gate Auto - Sunset Blvd',
        address: {
          addressLines: ['1820 Sunset Blvd'],
          locality: 'San Francisco',
          administrativeArea: 'CA',
          postalCode: '94122',
          country: 'US',
        },
        primaryPhone: '+1-415-555-0812',
        primaryCategory: 'Brake & Tire Shop',
        isConnected: true,
        automationEnabled: true,
        createdAt: cust2.createdAt,
        updatedAt: cust2.updatedAt,
      },
    ];
    this.subscriptions[cust2.id] = {
      id: 'sub_002',
      saasCustomerId: cust2.id,
      plan: 'GROWTH',
      status: 'ACTIVE',
      currentPeriodStart: '2026-09-10T00:00:00Z',
      currentPeriodEnd: '2026-10-10T00:00:00Z',
      cancelAtPeriodEnd: false,
      locationLimit: 3,
      monthlyReplyLimit: 150,
      stripeCustomerId: 'cus_goldengate_02',
      createdAt: cust2.createdAt,
      updatedAt: cust2.updatedAt,
    };
    this.notes[cust2.id] = [
      {
        id: 'note_002',
        saasCustomerId: cust2.id,
        authorAdminId: 'admin_usr_02',
        authorAdminName: 'Dave Operations',
        note: 'Customer onboarded second location in August. Upgraded to Growth Plan. Requested custom tone configuration.',
        createdAt: '2026-08-14T09:15:00Z',
        updatedAt: '2026-08-14T09:15:00Z',
      },
    ];

    // 3. Pacific Coast Bakery (Trialing Customer)
    const cust3: SaaSCustomer = {
      id: 'saas_cust_demo_03',
      name: 'Pacific Coast Artisan Bakery',
      billingEmail: 'hello@pacificcoastbakery.example.com',
      subscriptionId: 'sub_003',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    };
    this.customers.push(cust3);
    this.businesses[cust3.id] = {
      id: 'biz_003',
      saasCustomerId: cust3.id,
      name: 'Pacific Coast Bakery',
      industryCategory: 'Food & Beverage / Bakery',
      websiteUrl: 'https://pacificcoastbakery.example.com',
      createdAt: cust3.createdAt,
      updatedAt: cust3.updatedAt,
    };
    this.locations[cust3.id] = [
      {
        id: 'loc_003',
        businessId: 'biz_003',
        saasCustomerId: cust3.id,
        googleLocationId: 'locations/1089274910287',
        googlePlaceId: 'ChIJPacificBakery_sf',
        locationName: 'Pacific Coast Bakery - Marina',
        address: {
          addressLines: ['3320 Chestnut Street'],
          locality: 'San Francisco',
          administrativeArea: 'CA',
          postalCode: '94123',
          country: 'US',
        },
        primaryPhone: '+1-415-555-0422',
        primaryCategory: 'Bakery',
        isConnected: true,
        automationEnabled: true,
        createdAt: cust3.createdAt,
        updatedAt: cust3.updatedAt,
      },
    ];
    this.subscriptions[cust3.id] = {
      id: 'sub_003',
      saasCustomerId: cust3.id,
      plan: 'STARTER',
      status: 'TRIALING',
      currentPeriodStart: cust3.createdAt,
      currentPeriodEnd: new Date(Date.now() + 9 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      locationLimit: 1,
      monthlyReplyLimit: 50,
      createdAt: cust3.createdAt,
      updatedAt: cust3.updatedAt,
    };

    // 4. North Bay Veterinary (Past Due - Connection failure)
    const cust4: SaaSCustomer = {
      id: 'saas_cust_demo_04',
      name: 'North Bay Veterinary Clinic',
      billingEmail: 'admin@northbayvet.example.com',
      subscriptionId: 'sub_004',
      status: 'ACTIVE',
      createdAt: '2026-03-01T12:00:00Z',
      updatedAt: '2026-09-28T09:00:00Z',
    };
    this.customers.push(cust4);
    this.businesses[cust4.id] = {
      id: 'biz_004',
      saasCustomerId: cust4.id,
      name: 'North Bay Veterinary Clinic',
      industryCategory: 'Veterinary Services',
      createdAt: cust4.createdAt,
      updatedAt: cust4.updatedAt,
    };
    this.locations[cust4.id] = [
      {
        id: 'loc_004',
        businessId: 'biz_004',
        saasCustomerId: cust4.id,
        googleLocationId: 'locations/1089274910288',
        locationName: 'North Bay Vet - San Rafael',
        address: {
          addressLines: ['400 4th Street'],
          locality: 'San Rafael',
          administrativeArea: 'CA',
          postalCode: '94901',
          country: 'US',
        },
        primaryCategory: 'Veterinarian',
        isConnected: false, // Connection failed/token expired
        automationEnabled: false,
        createdAt: cust4.createdAt,
        updatedAt: cust4.updatedAt,
      },
    ];
    this.subscriptions[cust4.id] = {
      id: 'sub_004',
      saasCustomerId: cust4.id,
      plan: 'GROWTH',
      status: 'PAST_DUE',
      currentPeriodStart: '2026-09-01T00:00:00Z',
      currentPeriodEnd: '2026-10-01T00:00:00Z',
      cancelAtPeriodEnd: false,
      locationLimit: 2,
      monthlyReplyLimit: 100,
      createdAt: cust4.createdAt,
      updatedAt: cust4.updatedAt,
    };
    this.notes[cust4.id] = [
      {
        id: 'note_004',
        saasCustomerId: cust4.id,
        authorAdminId: 'admin_usr_01',
        authorAdminName: 'Sarah Platform Lead',
        note: 'Google Business Profile OAuth token expired on Sept 27. Stripe invoice past due. Automated re-authentication email dispatched.',
        createdAt: '2026-09-28T09:30:00Z',
        updatedAt: '2026-09-28T09:30:00Z',
      },
    ];

    // 5. Bay Area HVAC & Plumbing (Pro Plan - Active)
    const cust5: SaaSCustomer = {
      id: 'saas_cust_demo_05',
      name: 'Bay Area HVAC & Plumbing Experts',
      billingEmail: 'dispatch@bayareahvacpros.example.com',
      subscriptionId: 'sub_005',
      status: 'ACTIVE',
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-09-29T10:00:00Z',
    };
    this.customers.push(cust5);
    this.businesses[cust5.id] = {
      id: 'biz_005',
      saasCustomerId: cust5.id,
      name: 'Bay Area HVAC & Plumbing',
      industryCategory: 'Home Services / HVAC',
      createdAt: cust5.createdAt,
      updatedAt: cust5.updatedAt,
    };
    this.locations[cust5.id] = [
      {
        id: 'loc_005a',
        businessId: 'biz_005',
        saasCustomerId: cust5.id,
        googleLocationId: 'locations/1089274910289',
        locationName: 'Bay Area HVAC - East Bay Dispatch',
        address: {
          addressLines: ['1200 Broadway'],
          locality: 'Oakland',
          administrativeArea: 'CA',
          postalCode: '94612',
          country: 'US',
        },
        isConnected: true,
        automationEnabled: true,
        createdAt: cust5.createdAt,
        updatedAt: cust5.updatedAt,
      },
      {
        id: 'loc_005b',
        businessId: 'biz_005',
        saasCustomerId: cust5.id,
        googleLocationId: 'locations/1089274910290',
        locationName: 'Bay Area HVAC - Peninsula',
        address: {
          addressLines: ['500 El Camino Real'],
          locality: 'San Mateo',
          administrativeArea: 'CA',
          postalCode: '94401',
          country: 'US',
        },
        isConnected: true,
        automationEnabled: true,
        createdAt: cust5.createdAt,
        updatedAt: cust5.updatedAt,
      },
    ];
    this.subscriptions[cust5.id] = {
      id: 'sub_005',
      saasCustomerId: cust5.id,
      plan: 'PRO',
      status: 'ACTIVE',
      currentPeriodStart: '2026-09-20T00:00:00Z',
      currentPeriodEnd: '2026-10-20T00:00:00Z',
      cancelAtPeriodEnd: false,
      locationLimit: 5,
      monthlyReplyLimit: 300,
      createdAt: cust5.createdAt,
      updatedAt: cust5.updatedAt,
    };

    // 6. Sunset Boutique Fitness (Cancelled Customer)
    const cust6: SaaSCustomer = {
      id: 'saas_cust_demo_06',
      name: 'Sunset Boutique Fitness',
      billingEmail: 'owner@sunsetboutiquefit.example.com',
      subscriptionId: 'sub_006',
      status: 'CANCELLED',
      createdAt: '2026-01-05T09:00:00Z',
      updatedAt: '2026-08-15T10:00:00Z',
    };
    this.customers.push(cust6);
    this.businesses[cust6.id] = {
      id: 'biz_006',
      saasCustomerId: cust6.id,
      name: 'Sunset Boutique Fitness',
      industryCategory: 'Fitness / Yoga Studio',
      createdAt: cust6.createdAt,
      updatedAt: cust6.updatedAt,
    };
    this.locations[cust6.id] = [
      {
        id: 'loc_006',
        businessId: 'biz_006',
        saasCustomerId: cust6.id,
        googleLocationId: 'locations/1089274910291',
        locationName: 'Sunset Boutique Fitness - Main Studio',
        address: {
          addressLines: ['1410 Irving Street'],
          locality: 'San Francisco',
          administrativeArea: 'CA',
          postalCode: '94122',
          country: 'US',
        },
        isConnected: false,
        automationEnabled: false,
        createdAt: cust6.createdAt,
        updatedAt: cust6.updatedAt,
      },
    ];
    this.subscriptions[cust6.id] = {
      id: 'sub_006',
      saasCustomerId: cust6.id,
      plan: 'STARTER',
      status: 'CANCELED',
      currentPeriodStart: '2026-07-05T00:00:00Z',
      currentPeriodEnd: '2026-08-05T00:00:00Z',
      cancelAtPeriodEnd: true,
      locationLimit: 1,
      monthlyReplyLimit: 50,
      createdAt: cust6.createdAt,
      updatedAt: cust6.updatedAt,
    };

    // Seed audit events for demo tenant
    this.auditEvents = [
      {
        id: 'audit_001',
        saasCustomerId: 'saas_cust_demo_01',
        actorUserId: 'usr_demo_01',
        actorType: 'USER',
        action: 'LOCATION_CONNECTED',
        targetResourceType: 'LOCATION',
        targetResourceId: 'loc_001',
        details: { locationName: 'Downtown Dental Practice' },
        timestamp: '2026-01-15T10:15:00Z',
      },
      {
        id: 'audit_002',
        saasCustomerId: 'saas_cust_demo_01',
        actorUserId: 'usr_demo_01',
        actorType: 'USER',
        action: 'AUTOMATION_RULES_UPDATED',
        targetResourceType: 'AUTOMATION_RULE',
        targetResourceId: 'rule_001',
        details: { starRating: 5, action: 'AUTO_PUBLISH', delayMinutes: 15 },
        timestamp: '2026-02-01T14:22:00Z',
      },
      {
        id: 'audit_003',
        saasCustomerId: 'saas_cust_demo_01',
        actorType: 'SYSTEM_JOB',
        action: 'REPLY_AUTO_PUBLISHED',
        targetResourceType: 'REPLY',
        targetResourceId: 'reply_001',
        details: { reviewId: 'rev_001', author: 'Emily Rodriguez' },
        timestamp: '2026-09-30T04:30:00Z',
      },
    ];
  }

  /**
   * Calculates overall platform metrics for Platform Admin Dashboard
   */
  getPlatformMetrics(supportStats: { openTickets: number; highRiskTickets: number }): PlatformMetrics {
    const totalCustomers = this.customers.length;
    let activeCustomers = 0;
    let trialCustomers = 0;
    let cancelledCustomers = 0;
    let pastDueCustomers = 0;
    let mrr = 0;
    let googleConnectionFailures = 0;

    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    let newCustomers30d = 0;

    for (const cust of this.customers) {
      const sub = this.subscriptions[cust.id];
      if (new Date(cust.createdAt).getTime() >= thirtyDaysAgo) {
        newCustomers30d++;
      }

      if (sub) {
        if (sub.status === 'ACTIVE') {
          activeCustomers++;
          mrr += PLAN_MRR[sub.plan] || 0;
        } else if (sub.status === 'TRIALING') {
          trialCustomers++;
        } else if (sub.status === 'PAST_DUE') {
          pastDueCustomers++;
          mrr += PLAN_MRR[sub.plan] || 0;
        } else if (sub.status === 'CANCELED') {
          cancelledCustomers++;
        }
      }

      const locs = this.locations[cust.id] || [];
      const hasFailure = locs.some((l) => !l.isConnected);
      if (hasFailure && cust.status !== 'CANCELLED') {
        googleConnectionFailures++;
      }
    }

    return {
      totalCustomers,
      activeCustomers,
      trialCustomers,
      cancelledCustomers,
      pastDueCustomers,
      mrr,
      newCustomers30d,
      openSupportTickets: supportStats.openTickets,
      highRiskSupportTickets: supportStats.highRiskTickets,
      googleConnectionFailures,
    };
  }

  /**
   * Returns list of customers matching query, filter, and sort parameters
   */
  listCustomers(options: CustomerFilterOptions = {}): any[] {
    let result = this.customers.map((cust) => {
      const biz = this.businesses[cust.id];
      const sub = this.subscriptions[cust.id];
      const locs = this.locations[cust.id] || [];
      const mrr = sub ? PLAN_MRR[sub.plan] || 0 : 0;
      const reviewsHandled = cust.id === 'saas_cust_demo_01' ? 42 : cust.id === 'saas_cust_demo_02' ? 118 : 12;
      const lastActivity = cust.updatedAt;
      const hasConnectionFailure = locs.some((l) => !l.isConnected);

      return {
        id: cust.id,
        name: cust.name,
        billingEmail: cust.billingEmail,
        status: cust.status,
        createdAt: cust.createdAt,
        updatedAt: cust.updatedAt,
        businessName: biz?.name || 'N/A',
        industryCategory: biz?.industryCategory || 'General',
        plan: sub?.plan || 'STARTER',
        subscriptionStatus: sub?.status || 'INCOMPLETE',
        locationsCount: locs.length,
        hasConnectionFailure,
        reviewsHandled,
        lastActivity,
        mrr,
      };
    });

    // Search filter
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.billingEmail.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.businessName.toLowerCase().includes(q)
      );
    }

    // Plan filter
    if (options.plan && options.plan !== 'ALL') {
      result = result.filter((c) => c.plan === options.plan);
    }

    // Status filter
    if (options.status && options.status !== 'ALL') {
      result = result.filter((c) => c.subscriptionStatus === options.status || c.status === options.status);
    }

    // Connection filter
    if (options.connectionStatus === 'FAILED') {
      result = result.filter((c) => c.hasConnectionFailure);
    } else if (options.connectionStatus === 'HEALTHY') {
      result = result.filter((c) => !c.hasConnectionFailure);
    }

    // Sorting
    const sortBy = options.sortBy || 'mrr';
    const order = options.sortOrder === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      if (sortBy === 'mrr') return (a.mrr - b.mrr) * order;
      if (sortBy === 'reviews') return (a.reviewsHandled - b.reviewsHandled) * order;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * order;
      if (sortBy === 'createdAt') return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
      return (new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()) * order;
    });

    return result;
  }

  /**
   * Retrieves comprehensive 9-part detail of a single SaaSCustomer
   */
  getCustomerDetail(
    saasCustomerId: string,
    supportTickets: any[] = [],
    reviews: Review[] = []
  ): CustomerOverviewDetail | null {
    const customer = this.customers.find((c) => c.id === saasCustomerId);
    if (!customer) return null;

    const business = this.businesses[customer.id];
    const locations = this.locations[customer.id] || [];
    const subscription = this.subscriptions[customer.id];
    const mrr = subscription ? PLAN_MRR[subscription.plan] || 0 : 0;
    const notes = this.notes[customer.id] || [];
    const auditEvents = this.auditEvents.filter((e) => e.saasCustomerId === customer.id);
    const hasConnectionFailure = locations.some((l) => !l.isConnected);

    const customerReviews = reviews.filter((r) => r.saasCustomerId === customer.id);
    const customerTickets = supportTickets.filter((t) => t.saasCustomerId === customer.id);

    return {
      customer,
      business,
      locations,
      subscription,
      mrr,
      usage: {
        monthlyReplyLimit: subscription?.monthlyReplyLimit || 50,
        reviewsProcessedThisMonth: customerReviews.length || (customer.id === 'saas_cust_demo_01' ? 42 : 12),
        aiRepliesGeneratedThisMonth: customerReviews.length || (customer.id === 'saas_cust_demo_01' ? 42 : 12),
        autoPublishRate: customer.id === 'saas_cust_demo_01' ? 85.7 : 75.0,
      },
      recentReviews: customerReviews,
      supportTickets: customerTickets,
      auditEvents,
      notes,
      stats: {
        lastActivityAt: customer.updatedAt,
        hasConnectionFailure,
        riskFlagsCount: customerReviews.filter((r) => r.riskAssessment && r.riskAssessment.riskLevel !== 'LOW').length,
      },
    };
  }

  /**
   * Adds an internal private note about a customer (never visible to customer)
   */
  addCustomerNote(
    saasCustomerId: string,
    authorAdminId: string,
    authorAdminName: string,
    noteText: string
  ): CustomerNote {
    const note: CustomerNote = {
      id: `cnote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      saasCustomerId,
      authorAdminId,
      authorAdminName,
      note: noteText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!this.notes[saasCustomerId]) {
      this.notes[saasCustomerId] = [];
    }
    this.notes[saasCustomerId].unshift(note);

    this.logAuditEvent({
      saasCustomerId,
      actorUserId: authorAdminId,
      actorType: 'ADMIN',
      action: 'ADMIN_CUSTOMER_NOTE_ADDED',
      targetResourceType: 'INTERNAL_NOTE',
      targetResourceId: note.id,
      details: { noteLength: noteText.length, authorAdminName },
    });

    return note;
  }

  /**
   * Deletes a customer internal note
   */
  deleteCustomerNote(saasCustomerId: string, noteId: string, adminId: string): boolean {
    const list = this.notes[saasCustomerId];
    if (!list) return false;
    const initialLen = list.length;
    this.notes[saasCustomerId] = list.filter((n) => n.id !== noteId);
    if (this.notes[saasCustomerId].length < initialLen) {
      this.logAuditEvent({
        saasCustomerId,
        actorUserId: adminId,
        actorType: 'ADMIN',
        action: 'ADMIN_CUSTOMER_NOTE_DELETED',
        targetResourceType: 'INTERNAL_NOTE',
        targetResourceId: noteId,
      });
      return true;
    }
    return false;
  }

  /**
   * Safe Read-Only "View as Customer" Impersonation Generator
   * Generates a restricted, auditable customer snapshot.
   * NEVER exposes secrets.
   */
  generateReadOnlyCustomerSession(
    saasCustomerId: string,
    adminUser: { id: string; name: string; email: string; role: string }
  ): {
    success: boolean;
    impersonationContext?: {
      targetCustomer: SaaSCustomer;
      targetBusiness?: Business;
      readOnly: true;
      sessionExpiresAt: string;
      actorAdmin: { id: string; name: string; email: string };
    };
    error?: string;
  } {
    const customer = this.customers.find((c) => c.id === saasCustomerId);
    if (!customer) {
      return { success: false, error: 'Target SaaSCustomer not found' };
    }

    // Audit the impersonation event immediately
    this.logAuditEvent({
      saasCustomerId,
      actorUserId: adminUser.id,
      actorType: 'ADMIN',
      action: 'ADMIN_VIEW_AS_CUSTOMER_READ_ONLY',
      targetResourceType: 'CUSTOMER',
      targetResourceId: customer.id,
      details: {
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        readOnly: true,
        disclaimer: 'View as customer session initiated in strictly read-only mode',
      },
    });

    console.log(
      `[SECURITY AUDIT] Admin ${adminUser.email} initiated READ-ONLY view for SaaSCustomer ${customer.name} (${customer.id})`
    );

    return {
      success: true,
      impersonationContext: {
        targetCustomer: customer,
        targetBusiness: this.businesses[customer.id],
        readOnly: true,
        sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        actorAdmin: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
        },
      },
    };
  }

  logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditEvents.unshift(fullEvent);
    return fullEvent;
  }

  getAuditEvents(saasCustomerId?: string): AuditEvent[] {
    if (saasCustomerId) {
      return this.auditEvents.filter((e) => e.saasCustomerId === saasCustomerId);
    }
    return [...this.auditEvents];
  }
}
