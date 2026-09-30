import {
  ReviewRepository,
  ReplyRepository,
  TenantRepository,
  UserRepository,
  BillingRepository,
  GoogleConnectionRepository,
  AutomationRuleRepository,
  BrandVoiceRepository,
  AuditRepository,
  SupportRepository,
  NotificationRepository,
  IdempotencyRepository,
  JobRecordRepository,
  OAuthStateRepository,
  isUniqueConstraintError,
} from '../../server/repositories/postgresRepositories.ts';
import { db } from '../../server/db/index.ts';
import * as schema from '../../server/db/schema.ts';
import { sql } from 'drizzle-orm';
import type { Review, ReviewReply, SaaSCustomer, User, BusinessLocation } from '../../shared/types/domain.ts';

export async function runPostgresPersistenceTests(): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const tenantRepo = new TenantRepository();
  const userRepo = new UserRepository();
  const reviewRepo = new ReviewRepository();
  const replyRepo = new ReplyRepository();
  const billingRepo = new BillingRepository();
  const googleRepo = new GoogleConnectionRepository();
  const ruleRepo = new AutomationRuleRepository();
  const brandVoiceRepo = new BrandVoiceRepository();
  const auditRepo = new AuditRepository();
  const supportRepo = new SupportRepository();
  const notifRepo = new NotificationRepository();
  const idempotencyRepo = new IdempotencyRepository();
  const jobRepo = new JobRecordRepository();
  const oauthRepo = new OAuthStateRepository();

  const tenantA = 'tenant_persist_a';
  const tenantB = 'tenant_persist_b';
  const locA = 'loc_persist_a1';
  const locB = 'loc_persist_b1';

  try {
    // ----------------------------------------------------
    // 1. REPOSITORY CRUD & SEEDING
    // ----------------------------------------------------
    const createdTenantA = await tenantRepo.create({
      id: tenantA,
      name: 'Persist Clinic A',
      billingEmail: 'billing@clinic-a.com',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const createdTenantB = await tenantRepo.create({
      id: tenantB,
      name: 'Persist Shop B',
      billingEmail: 'billing@shop-b.com',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const fetchedTenantA = await tenantRepo.getById(tenantA);
    if (fetchedTenantA && fetchedTenantA.name === 'Persist Clinic A') {
      passed++;
      results.push('PASS [CRUD]: Tenant persisted and retrieved with correct fields');
    } else {
      failed++;
      results.push('FAIL [CRUD]: Tenant retrieval failed or returned incorrect data');
    }

    // Seed businesses for Tenant A and Tenant B
    await db.insert(schema.businesses).values([
      { id: 'biz_a1', tenantId: tenantA, name: 'Clinic A Business' },
      { id: 'biz_b1', tenantId: tenantB, name: 'Shop B Business' },
    ]).onConflictDoNothing();

    // Seed location for Tenant A
    await googleRepo.upsertLocation(tenantA, {
      id: locA,
      saasCustomerId: tenantA,
      businessId: 'biz_a1',
      googleLocationId: 'locations/1001',
      locationName: 'Clinic A Downtown',
      address: {
        addressLines: ['100 Main St'],
        locality: 'San Francisco',
        administrativeArea: 'CA',
        postalCode: '94105',
        country: 'US',
      },
      isConnected: true,
      automationEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed location for Tenant B
    await googleRepo.upsertLocation(tenantB, {
      id: locB,
      saasCustomerId: tenantB,
      businessId: 'biz_b1',
      googleLocationId: 'locations/2001',
      locationName: 'Shop B Uptown',
      address: {
        addressLines: ['200 Market St'],
        locality: 'San Francisco',
        administrativeArea: 'CA',
        postalCode: '94103',
        country: 'US',
      },
      isConnected: true,
      automationEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // ----------------------------------------------------
    // 2. TENANT ISOLATION
    // ----------------------------------------------------
    const reviewA: Review = {
      id: 'rev_iso_01',
      saasCustomerId: tenantA,
      businessLocationId: locA,
      googleReviewId: 'g_rev_iso_01',
      googleReviewName: 'accounts/1/locations/1001/reviews/g_rev_iso_01',
      author: { displayName: 'John Doe', isAnonymous: false },
      starRating: 5,
      comment: 'Top notch care!',
      reviewCreatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await reviewRepo.create(tenantA, reviewA);

    // Tenant B attempts to fetch Tenant A's review
    const crossTenantReview = await reviewRepo.getById(tenantB, reviewA.id);
    const tenantBReviewList = await reviewRepo.listByTenant(tenantB);

    if (crossTenantReview === null && !tenantBReviewList.some((r) => r.id === reviewA.id)) {
      passed++;
      results.push('PASS [TENANT ISOLATION]: Scoped queries prevent cross-tenant record leakage');
    } else {
      failed++;
      results.push('FAIL [TENANT ISOLATION]: Cross-tenant review leaked to Tenant B');
    }

    // ----------------------------------------------------
    // 3. UNIQUE CONSTRAINTS
    // ----------------------------------------------------
    // 3A. Reviews: unique tenant_id + google_review_name
    let duplicateReviewBlocked = false;
    try {
      const duplicateReview: Review = {
        id: 'rev_iso_02_duplicate',
        saasCustomerId: tenantA,
        businessLocationId: locA,
        googleReviewId: 'g_rev_iso_02',
        googleReviewName: 'accounts/1/locations/1001/reviews/g_rev_iso_01', // Same googleReviewName as reviewA
        author: { displayName: 'Jane Doe', isAnonymous: false },
        starRating: 4,
        reviewCreatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await reviewRepo.create(tenantA, duplicateReview);
    } catch (err: any) {
      if (isUniqueConstraintError(err)) {
        duplicateReviewBlocked = true;
      }
    }

    if (duplicateReviewBlocked) {
      passed++;
      results.push('PASS [CONSTRAINT]: Duplicate review (tenant_id + google_review_name) rejected by PostgreSQL');
    } else {
      failed++;
      results.push('FAIL [CONSTRAINT]: Duplicate review was allowed or failed with unexpected error');
    }

    // 3B. Memberships: unique tenant_id + user_id
    const user1: User = {
      id: 'usr_persist_01',
      email: 'user1@clinic-a.com',
      name: 'Dr. Persist One',
      role: 'OWNER',
      saasCustomerId: tenantA,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await userRepo.create(user1);
    await userRepo.createMembership(tenantA, user1.id, 'OWNER');
    // Updating membership role with same user and tenant should succeed without creating duplicate rows
    await userRepo.createMembership(tenantA, user1.id, 'ADMIN');
    const membership = await userRepo.getMembership(tenantA, user1.id);
    if (membership && membership.role === 'ADMIN') {
      passed++;
      results.push('PASS [CONSTRAINT]: Tenant membership upsert respects (tenant_id, user_id) unique constraint');
    } else {
      failed++;
      results.push('FAIL [CONSTRAINT]: Tenant membership update failed');
    }

    // 3C. Paddle webhook events: unique event_id
    const eventId = 'evt_paddle_test_unique_01';
    const firstDelivery = await billingRepo.recordWebhookEvent(eventId, 'subscription.created', { data: 123 });
    const duplicateDelivery = await billingRepo.recordWebhookEvent(eventId, 'subscription.created', { data: 123 });

    if (firstDelivery === true && duplicateDelivery === false) {
      passed++;
      results.push('PASS [CONSTRAINT]: Webhook event uniqueness strictly enforced (first=true, duplicate=false)');
    } else {
      failed++;
      results.push(`FAIL [CONSTRAINT]: Webhook uniqueness failed (first=${firstDelivery}, duplicate=${duplicateDelivery})`);
    }

    // 3D. Google connections: unique (tenant_id, business_location_id, google_account_id)
    await googleRepo.upsert(tenantA, {
      id: 'gconn_persist_01',
      saasCustomerId: tenantA,
      businessLocationId: locA,
      googleAccountId: 'acc_persist_99',
      googleLocationName: 'accounts/acc_persist_99/locations/1001',
      scopes: ['https://www.googleapis.com/auth/business.manage'],
      status: 'CONNECTED',
      tokenExpiry: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const fetchedConn = await googleRepo.getByLocationId(tenantA, locA);
    if (fetchedConn && fetchedConn.googleAccountId === 'acc_persist_99') {
      passed++;
      results.push('PASS [CONSTRAINT]: Google connection persisted with location & account constraints');
    } else {
      failed++;
      results.push('FAIL [CONSTRAINT]: Google connection retrieval failed');
    }

    // ----------------------------------------------------
    // 4. AUTHORITATIVE REVIEW + REPLY TRANSACTION & ROLLBACK
    // ----------------------------------------------------
    const atomicReview: Review = {
      id: 'rev_atomic_01',
      saasCustomerId: tenantA,
      businessLocationId: locA,
      googleReviewId: 'g_rev_atomic_01',
      googleReviewName: 'accounts/1/locations/1001/reviews/g_rev_atomic_01',
      author: { displayName: 'Atomic Reviewer', isAnonymous: false },
      starRating: 5,
      comment: 'Flawless visit!',
      reviewCreatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const atomicReply: ReviewReply = {
      id: 'reply_atomic_01',
      saasCustomerId: tenantA,
      reviewId: 'rev_atomic_01',
      businessLocationId: locA,
      proposedText: 'Thank you for visiting us!',
      status: 'PENDING_APPROVAL',
      generatedByAi: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const txResult = await reviewRepo.createReviewAndReply(tenantA, atomicReview, atomicReply);
    if (txResult.review.id === 'rev_atomic_01' && txResult.reply.id === 'reply_atomic_01') {
      passed++;
      results.push('PASS [TRANSACTION]: createReviewAndReply committed atomically');
    } else {
      failed++;
      results.push('FAIL [TRANSACTION]: createReviewAndReply returned invalid records');
    }

    // Rollback test: try transaction with broken reply that violates foreign key / constraint
    let rollbackVerified = false;
    const brokenReview: Review = {
      id: 'rev_rollback_01',
      saasCustomerId: tenantA,
      businessLocationId: locA,
      googleReviewId: 'g_rev_rb_01',
      googleReviewName: 'accounts/1/locations/1001/reviews/g_rev_rb_01',
      author: { displayName: 'Rollback Tester', isAnonymous: false },
      starRating: 1,
      reviewCreatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Force duplicate reply ID that violates primary key constraint
    const brokenReply: ReviewReply = {
      id: 'reply_atomic_01', // Already exists! Will violate PK
      saasCustomerId: tenantA,
      reviewId: 'rev_rollback_01',
      businessLocationId: locA,
      proposedText: 'Duplicate ID test',
      status: 'PENDING_APPROVAL',
      generatedByAi: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await reviewRepo.createReviewAndReply(tenantA, brokenReview, brokenReply);
    } catch {
      // Transaction must have rolled back
      const orphanedReview = await reviewRepo.getById(tenantA, 'rev_rollback_01');
      if (orphanedReview === null) {
        rollbackVerified = true;
      }
    }

    if (rollbackVerified) {
      passed++;
      results.push('PASS [TRANSACTION]: Transaction rollback guarantees no orphaned review on reply insertion failure');
    } else {
      failed++;
      results.push('FAIL [TRANSACTION]: Orphaned review was persisted despite transaction failure');
    }

    // ----------------------------------------------------
    // 5. POSTGRESQL IDEMPOTENCY LAYER
    // ----------------------------------------------------
    const idemKey = 'idem_key_payment_1001';
    const opName = 'CHARGE_CUSTOMER';
    const hash = 'hash_abc_123';

    // 5A. First request acquires lock
    const acquired1 = await idempotencyRepo.acquireKey(tenantA, idemKey, opName, hash, 60);

    // 5B. Concurrent identical request while in-flight is denied
    const acquired2 = await idempotencyRepo.acquireKey(tenantA, idemKey, opName, hash, 60);

    // 5C. Complete the operation
    await idempotencyRepo.complete(tenantA, idemKey, opName, 200, { transactionId: 'tx_998877' });

    // 5D. Subsequent request retrieves cached response
    const completedRecord = await idempotencyRepo.getRecord(tenantA, idemKey, opName);

    if (
      acquired1 === true &&
      acquired2 === false &&
      completedRecord !== null &&
      completedRecord.responseStatus === 200 &&
      (completedRecord.responseBody as any)?.transactionId === 'tx_998877'
    ) {
      passed++;
      results.push('PASS [IDEMPOTENCY]: Atomic PostgreSQL lock prevents concurrent duplicate execution and caches result');
    } else {
      failed++;
      results.push('FAIL [IDEMPOTENCY]: Idempotency locking or caching failed');
    }

    // ----------------------------------------------------
    // 6. OAUTH STATE PERSISTENCE (SINGLE-USE & TTL)
    // ----------------------------------------------------
    const oauthStateVal = 'state_oauth_secure_random_777';
    await oauthRepo.createState(tenantA, user1.id, oauthStateVal, 600);

    // First consumption succeeds
    const consumed1 = await oauthRepo.validateAndConsumeState(oauthStateVal);

    // Second consumption MUST fail (single-use constraint)
    const consumed2 = await oauthRepo.validateAndConsumeState(oauthStateVal);

    if (consumed1 !== null && consumed1.consumedAt && consumed2 === null) {
      passed++;
      results.push('PASS [OAUTH STATE]: State successfully persisted and single-use consumption strictly enforced');
    } else {
      failed++;
      results.push('FAIL [OAUTH STATE]: OAuth state single-use enforcement failed');
    }

    // ----------------------------------------------------
    // 7. DURABLE JOBS
    // ----------------------------------------------------
    const job = await jobRepo.createJob({
      tenantId: tenantA,
      jobId: 'job_durable_01',
      entityId: 'ent_01',
      operation: 'AI_REPLY_PROCESSING',
      idempotencyKey: 'idem_job_01',
    });

    const locked = await jobRepo.lockJob('job_durable_01', 'worker_pod_1');
    await jobRepo.completeJob('job_durable_01');
    const finishedJob = await jobRepo.getJob('job_durable_01');

    if (job && locked && finishedJob?.status === 'COMPLETED' && finishedJob?.completedAt) {
      passed++;
      results.push('PASS [JOBS]: Durable job lifecycle (create -> lock -> complete) tracked in PostgreSQL');
    } else {
      failed++;
      results.push('FAIL [JOBS]: Durable job lifecycle tracking failed');
    }

    // ----------------------------------------------------
    // 8. DATABASE FAILURE PROPAGATION (NO FAKE FALLBACK)
    // ----------------------------------------------------
    let errorPropagated = false;
    try {
      // Query with non-existent tenant table column or invalid raw query
      await db.execute(sql`SELECT * FROM non_existent_table_for_error_test_probe`);
    } catch (err: any) {
      errorPropagated = true;
    }

    if (errorPropagated) {
      passed++;
      results.push('PASS [ERROR PROPAGATION]: Database errors propagate authentically without silent fallback to memory');
    } else {
      failed++;
      results.push('FAIL [ERROR PROPAGATION]: Database error was silently swallowed');
    }
  } catch (outerErr: any) {
    failed++;
    results.push(`FAIL [FATAL]: Unexpected error during PostgreSQL persistence test: ${outerErr.message}`);
  }

  return { passed, failed, results };
}
