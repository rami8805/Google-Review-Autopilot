import { db } from './index.ts';
import * as schema from './schema.ts';
import { sql } from 'drizzle-orm';
import { DEFAULT_AUTOMATION_RULES } from '../../shared/constants/automation.ts';

/**
 * Explicit Seed Script
 *
 * Populates PostgreSQL database with initial tenant, demo locations, rules, and brand voice.
 * Production migrations never silently convert mock state into production state.
 * Run explicitly via: npm run db:seed
 */
export async function seedDatabase() {
  console.log('[Seed] Starting explicit PostgreSQL database seed...');

  try {
    // 1. Tenant
    await db
      .insert(schema.tenants)
      .values({
        id: 'saas_cust_demo_01',
        name: 'Downtown Dental SF',
        billingEmail: 'billing@downtowndental-sf.com',
        status: 'ACTIVE',
      })
      .onConflictDoNothing();

    // 2. User
    await db
      .insert(schema.users)
      .values({
        id: 'usr_demo_01',
        identitySubject: 'google_sub_1089274910284',
        email: 'owner@downtowndental-sf.com',
        name: 'Dr. Sarah Lin',
      })
      .onConflictDoNothing();

    // 3. Tenant Membership
    await db
      .insert(schema.tenantMemberships)
      .values({
        id: 'mem_demo_01',
        tenantId: 'saas_cust_demo_01',
        userId: 'usr_demo_01',
        role: 'OWNER',
      })
      .onConflictDoNothing();

    // 4. Business
    await db
      .insert(schema.businesses)
      .values({
        id: 'biz_001',
        tenantId: 'saas_cust_demo_01',
        name: 'Downtown Dental Practice',
        industryCategory: 'Dentist',
        websiteUrl: 'https://downtowndental-sf.com',
      })
      .onConflictDoNothing();

    // 5. Business Location
    await db
      .insert(schema.businessLocations)
      .values({
        id: 'loc_001',
        tenantId: 'saas_cust_demo_01',
        businessId: 'biz_001',
        googleLocationId: 'locations/1089274910284',
        googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        locationName: 'Downtown Dental Practice',
        addressLines: ['104 Market Street', 'Suite 200'],
        locality: 'San Francisco',
        administrativeArea: 'CA',
        postalCode: '94103',
        country: 'US',
        primaryPhone: '+1-415-555-0199',
        primaryCategory: 'Dentist',
        isConnected: true,
        automationEnabled: true,
      })
      .onConflictDoNothing();

    // 6. Google Connection
    await db
      .insert(schema.googleConnections)
      .values({
        id: 'gconn_001',
        tenantId: 'saas_cust_demo_01',
        businessLocationId: 'loc_001',
        googleAccountId: 'accounts/101',
        googleLocationName: 'accounts/101/locations/1089274910284',
        status: 'CONNECTED',
        scopes: ['https://www.googleapis.com/auth/business.manage'],
      })
      .onConflictDoNothing();

    // 7. Automation Rules
    for (let i = 0; i < DEFAULT_AUTOMATION_RULES.length; i++) {
      const rule = DEFAULT_AUTOMATION_RULES[i];
      await db
        .insert(schema.automationRules)
        .values({
          id: `rule_00${i + 1}`,
          tenantId: 'saas_cust_demo_01',
          businessLocationId: 'loc_001',
          starRating: rule.starRating,
          maxRiskLevelForAutoPublish: rule.maxRiskLevelForAutoPublish,
          action: rule.action,
          delayMinutesBeforePublish: rule.delayMinutesBeforePublish,
          isActive: rule.isActive,
        })
        .onConflictDoNothing();
    }

    // 8. Brand Voice
    await db
      .insert(schema.brandVoice)
      .values({
        id: 'bv_001',
        tenantId: 'saas_cust_demo_01',
        businessLocationId: 'loc_001',
        tone: 'WARM_AND_PROFESSIONAL',
        signOffTemplate: 'Warm regards,\nDr. Sarah & The Downtown Dental Team',
        ownerOrManagerTitle: 'Practice Director',
        contactEmailForInquiries: 'care@downtowndental-sf.com',
        contactPhoneForInquiries: '+1-415-555-0199',
        coreServicesOffered: ['General Dentistry', 'Cleanings', 'Invisalign', 'Emergency Dental Care'],
        prohibitedTopics: ['No prices over public reviews', 'No admission of liability', 'No free service offers'],
      })
      .onConflictDoNothing();

    // 9. Initial Subscription
    await db
      .insert(schema.subscriptions)
      .values({
        id: 'sub_saas_cust_demo_01',
        tenantId: 'saas_cust_demo_01',
        plan: 'STARTER',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        cancelAtPeriodEnd: false,
        locationLimit: 1,
        monthlyReplyLimit: 50,
      })
      .onConflictDoNothing();

    // 10. Reviews & Replies
    await db
      .insert(schema.reviews)
      .values({
        id: 'rev_001',
        tenantId: 'saas_cust_demo_01',
        businessLocationId: 'loc_001',
        googleReviewId: 'google_rev_101',
        googleReviewName: 'accounts/101/locations/loc_001/reviews/google_rev_101',
        authorName: 'Emily Rodriguez',
        authorIsAnonymous: false,
        starRating: 5,
        comment: 'Dr. Sarah and the hygienists are the best in SF! Extremely gentle cleaning and spotless clinic.',
        reviewCreatedAt: new Date(Date.now() - 3600000 * 4),
        riskLevel: 'LOW',
        riskFlags: [],
        riskExplanation: 'Positive feedback without legal or safety concerns.',
        riskConfidence: '0.98',
        replyId: 'reply_001',
      })
      .onConflictDoNothing();

    await db
      .insert(schema.reviewReplies)
      .values({
        id: 'reply_001',
        tenantId: 'saas_cust_demo_01',
        reviewId: 'rev_001',
        businessLocationId: 'loc_001',
        proposedText: 'Hi Emily, thank you so much for the 5-star review! Dr. Sarah and the whole team are thrilled to hear your cleaning went so smoothly. See you at your next visit!',
        publishedText: 'Hi Emily, thank you so much for the 5-star review! Dr. Sarah and the whole team are thrilled to hear your cleaning went so smoothly. See you at your next visit!',
        status: 'AUTO_PUBLISHED',
        generatedByAi: true,
        aiModel: 'gemini-3.8-flash',
        guardDecision: 'AUTO_PUBLISH',
        publishedAt: new Date(Date.now() - 3600000 * 3.5),
      })
      .onConflictDoNothing();

    console.log('[Seed] Database seed completed successfully!');
  } catch (err) {
    console.error('[Seed] Database seed failed:', (err as Error).message);
    throw err;
  }
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
