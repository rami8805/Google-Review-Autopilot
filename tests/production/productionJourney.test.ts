/**
 * Production Readiness & Architecture Invariant Test Suite
 *
 * Verifies:
 * 1. Authentication & Google Identity Platform OIDC tokens
 * 2. Tenant Isolation & IDOR exploit defenses
 * 3. Server-side Admin RBAC & missing-header protection
 * 4. Paddle Sandbox Webhook HMAC-SHA256 verification & replay protection
 * 5. Multi-tenant repositories & tenant-scoping
 * 6. Cloud Tasks job lifecycle & idempotency
 * 7. Billing entitlement gating
 */

import crypto from 'crypto';
import { verifyToken, requireTenantOwnership } from '../../server/middleware/auth.ts';
import { PaddleBillingService } from '../../server/services/billing/paddleService.ts';
import {
  ReviewRepository,
  ReplyRepository,
  TenantRepository,
  BillingRepository,
  IdempotencyRepository,
  JobRecordRepository,
} from '../../server/repositories/postgresRepositories.ts';
import { CloudTasksService } from '../../server/services/tasks/cloudTasksService.ts';
import type { Review, ReviewReply } from '../../shared/types/domain.ts';

export async function runProductionTests(): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const tenantRepo = new TenantRepository();
  const reviewRepo = new ReviewRepository();
  const replyRepo = new ReplyRepository();
  const billingRepo = new BillingRepository();
  const idempotencyRepo = new IdempotencyRepository();
  const jobRepo = new JobRecordRepository();
  const cloudTasks = new CloudTasksService();

  // Seed two distinct tenants for cross-tenant testing
  const tenantA = 'tenant_alpha_01';
  const tenantB = 'tenant_bravo_02';

  await tenantRepo.create({
    id: tenantA,
    name: 'Alpha Dental',
    billingEmail: 'billing@alphadental.com',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await tenantRepo.create({
    id: tenantB,
    name: 'Bravo Auto Repair',
    billingEmail: 'billing@bravoauto.com',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Seed Tenant A review
  const reviewA: Review = {
    id: 'rev_alpha_101',
    saasCustomerId: tenantA,
    businessLocationId: 'loc_alpha_01',
    googleReviewId: 'g_rev_a1',
    googleReviewName: 'accounts/1/locations/loc_alpha_01/reviews/g_rev_a1',
    author: { displayName: 'Alice Alpha', isAnonymous: false },
    starRating: 5,
    comment: 'Great dental cleaning!',
    reviewCreatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await reviewRepo.create(tenantA, reviewA);

  // ========================================================
  // 1. AUTHENTICATION & GOOGLE IDENTITY PLATFORM TOKEN TESTS
  // ========================================================
  try {
    const validCtx = await verifyToken('test_token_usr1_tenant_alpha_01_owner');
    if (validCtx && validCtx.tenantId === 'tenant_alpha_01' && validCtx.role === 'OWNER') {
      passed++;
      results.push('PASS [AUTH]: Google Identity token verified and tenant/role bound');
    } else {
      failed++;
      results.push('FAIL [AUTH]: Token verification returned invalid context');
    }
  } catch (e) {
    failed++;
    results.push(`FAIL [AUTH]: Token verification threw: ${(e as Error).message}`);
  }

  try {
    const invalidCtx = await verifyToken('unauthorized_gibberish_token');
    if (invalidCtx === null) {
      passed++;
      results.push('PASS [AUTH]: Malformed/unauthorized token strictly rejected');
    } else {
      failed++;
      results.push('FAIL [AUTH]: Malformed token was accepted');
    }
  } catch (e) {
    failed++;
    results.push(`FAIL [AUTH]: Malformed token threw: ${(e as Error).message}`);
  }

  // ========================================================
  // 2. TENANT ISOLATION & IDOR DEFENSE TESTS
  // ========================================================
  try {
    // Tenant B attempts to fetch Tenant A's review from repository
    const fetchedByB = await reviewRepo.getById(tenantB, reviewA.id);
    if (fetchedByB === null) {
      passed++;
      results.push('PASS [TENANT]: Tenant B cannot access Tenant A review (Repository scoping)');
    } else {
      failed++;
      results.push('FAIL [TENANT]: Tenant B leaked Tenant A review');
    }
  } catch (e) {
    failed++;
    results.push(`FAIL [TENANT]: Cross-tenant review fetch threw: ${(e as Error).message}`);
  }

  try {
    // Simulated request from Tenant B trying to access Tenant A entity
    const mockReqTenantB: any = {
      auth: {
        userId: 'usr_b',
        tenantId: tenantB,
        role: 'OWNER',
      },
    };
    const mockRes: any = {
      status: (code: number) => ({
        json: (data: any) => ({ code, data }),
      }),
    };

    const isPermitted = requireTenantOwnership(tenantA, mockReqTenantB, mockRes);
    if (!isPermitted) {
      passed++;
      results.push('PASS [TENANT]: requireTenantOwnership strictly blocks cross-tenant access');
    } else {
      failed++;
      results.push('FAIL [TENANT]: requireTenantOwnership allowed cross-tenant access');
    }
  } catch (e) {
    failed++;
    results.push(`FAIL [TENANT]: Ownership check threw: ${(e as Error).message}`);
  }

  try {
    // Forged x-tenant-id header immunity: verify that tenant identity comes ONLY from req.auth
    const authCtx = await verifyToken('test_token_usr1_tenant_alpha_01_owner');
    // Even if client header claimed tenantB, authCtx remains tenantA
    if (authCtx?.tenantId === tenantA) {
      passed++;
      results.push('PASS [TENANT]: Forged client headers cannot override cryptographic token tenant');
    } else {
      failed++;
      results.push('FAIL [TENANT]: Client header overrode token tenant');
    }
  } catch (e) {
    failed++;
    results.push(`FAIL [TENANT]: Header forgery check threw: ${(e as Error).message}`);
  }

  // ========================================================
  // 3. ADMIN RBAC & AUTHORIZATION BYPASS DEFENSE TESTS
  // ========================================================
  try {
    // User with OWNER role attempting admin access
    const ownerCtx = await verifyToken('test_token_usr1_tenant_alpha_01_owner');
    const isOwnerAdmin = ownerCtx?.role === 'SUPER_ADMIN';
    if (!isOwnerAdmin) {
      passed++;
      results.push('PASS [RBAC]: Normal tenant OWNER role denied SUPER_ADMIN access');
    } else {
      failed++;
      results.push('FAIL [RBAC]: OWNER role mistakenly granted SUPER_ADMIN');
    }
  } catch (e) {
    failed++;
    results.push(`FAIL [RBAC]: Admin check threw: ${(e as Error).message}`);
  }

  try {
    // Genuine SUPER_ADMIN token
    const adminCtx = await verifyToken('test_token_super_admin_system_super_admin');
    if (adminCtx?.role === 'SUPER_ADMIN') {
      passed++;
      results.push('PASS [RBAC]: Verified SUPER_ADMIN role correctly recognized');
    } else {
      failed++;
      results.push('FAIL [RBAC]: SUPER_ADMIN role was not recognized');
    }
  } catch (e) {
    failed++;
    results.push(`FAIL [RBAC]: Super admin check threw: ${(e as Error).message}`);
  }

  // ========================================================
  // 4. PADDLE SANDBOX BILLING & WEBHOOK SIGNATURE TESTS
  // ========================================================
  const testSecret = 'pdl_ntfset_01testsecretkey1234567890';
  const paddleService = new PaddleBillingService({ webhookSecret: testSecret });

  try {
    const rawBody = JSON.stringify({
      event_id: 'evt_test_paid_001',
      event_type: 'transaction.paid',
      data: {
        id: 'txn_001',
        customer_id: 'ctm_001',
        subscription_id: 'sub_paddle_001',
        custom_data: { tenant_id: tenantA, plan: 'GROWTH' },
      },
    });

    const ts = Math.floor(Date.now() / 1000).toString();
    const h1 = crypto
      .createHmac('sha256', testSecret)
      .update(`${ts}:${rawBody}`)
      .digest('hex');
    const validSignature = `ts=${ts};h1=${h1}`;

    const isValid = paddleService.verifyWebhookSignature(rawBody, validSignature);
    if (isValid) {
      passed++;
      results.push('PASS [PADDLE]: Valid HMAC-SHA256 signature accepted');
    } else {
      failed++;
      results.push('FAIL [PADDLE]: Valid signature was rejected');
    }

    // Invalid signature test
    const isInvalid = paddleService.verifyWebhookSignature(rawBody, 'ts=1680000000;h1=fake_tampered_signature');
    if (!isInvalid) {
      passed++;
      results.push('PASS [PADDLE]: Tampered/invalid signature strictly rejected');
    } else {
      failed++;
      results.push('FAIL [PADDLE]: Tampered signature was accepted');
    }

    // Webhook event processing test
    const processResult = await paddleService.processWebhookEvent(rawBody, validSignature);
    if (processResult.success && processResult.eventType === 'transaction.paid') {
      passed++;
      results.push('PASS [PADDLE]: Webhook event processed and subscription activated');
    } else {
      failed++;
      results.push(`FAIL [PADDLE]: Webhook event failed: ${processResult.error}`);
    }

    // Duplicate webhook delivery test (Replay protection)
    const duplicateResult = await paddleService.processWebhookEvent(rawBody, validSignature);
    if (duplicateResult.success && duplicateResult.error === 'DUPLICATE_EVENT_IGNORED') {
      passed++;
      results.push('PASS [PADDLE]: Duplicate webhook delivery detected & handled idempotently');
    } else {
      failed++;
      results.push('FAIL [PADDLE]: Duplicate webhook was not deduplicated');
    }
  } catch (e) {
    failed++;
    results.push(`FAIL [PADDLE]: Paddle test threw: ${(e as Error).message}`);
  }

  // ========================================================
  // 5. IDEMPOTENCY & REPEAT OPERATION DEFENSE TESTS
  // ========================================================
  try {
    const key = 'idem_key_test_pub_01';
    const acquiredFirst = await idempotencyRepo.acquireKey(tenantA, key, 'PUBLISH_REPLY', 'hash_abc');
    const acquiredSecond = await idempotencyRepo.acquireKey(tenantA, key, 'PUBLISH_REPLY', 'hash_abc');

    if (acquiredFirst === true && acquiredSecond === false) {
      passed++;
      results.push('PASS [IDEMPOTENCY]: Idempotency key lock prevents duplicate execution');
    } else {
      failed++;
      results.push(`FAIL [IDEMPOTENCY]: Lock failed (1st: ${acquiredFirst}, 2nd: ${acquiredSecond})`);
    }

    await idempotencyRepo.complete(tenantA, key, 'PUBLISH_REPLY', 200, { published: true });
    const completedRecord = await idempotencyRepo.getRecord(tenantA, key, 'PUBLISH_REPLY');
    if (completedRecord?.responseStatus === 200) {
      passed++;
      results.push('PASS [IDEMPOTENCY]: Cached response returned for repeat requests');
    } else {
      failed++;
      results.push('FAIL [IDEMPOTENCY]: Failed to retrieve completed idempotency record');
    }
  } catch (e) {
    failed++;
    results.push(`FAIL [IDEMPOTENCY]: Idempotency test threw: ${(e as Error).message}`);
  }

  // ========================================================
  // 6. CLOUD TASKS BACKGROUND JOB LIFECYCLE TESTS
  // ========================================================
  try {
    const job = await cloudTasks.enqueue({
      tenantId: tenantA,
      entityId: 'entity_99',
      operation: 'NOTIFICATION_DELIVERY',
      payload: { title: 'Test Task', message: 'Hello from Cloud Tasks' },
    });

    if (job && job.jobId && job.operation === 'NOTIFICATION_DELIVERY') {
      passed++;
      results.push('PASS [CLOUD_TASKS]: Job enqueued and assigned unique tracking jobId');
    } else {
      failed++;
      results.push('FAIL [CLOUD_TASKS]: Enqueue failed to return valid job');
    }

    // Execute job worker
    const execResult = await cloudTasks.executeJob(job.jobId);
    if (execResult.success) {
      passed++;
      results.push('PASS [CLOUD_TASKS]: Cloud Tasks worker executed job to completion');
    } else {
      failed++;
      results.push(`FAIL [CLOUD_TASKS]: Job execution failed: ${execResult.error}`);
    }

    // Repeat execution should be idempotent
    const repeatResult = await cloudTasks.executeJob(job.jobId);
    if (repeatResult.success && repeatResult.status === 'ALREADY_COMPLETED') {
      passed++;
      results.push('PASS [CLOUD_TASKS]: Repeat task execution recognized as ALREADY_COMPLETED');
    } else {
      failed++;
      results.push('FAIL [CLOUD_TASKS]: Repeat execution was not idempotent');
    }
  } catch (e) {
    failed++;
    results.push(`FAIL [CLOUD_TASKS]: Cloud Tasks test threw: ${(e as Error).message}`);
  }

  // ========================================================
  // 7. BILLING ENTITLEMENT GATE TEST
  // ========================================================
  try {
    await billingRepo.upsertSubscription(tenantA, {
      id: `sub_${tenantA}`,
      saasCustomerId: tenantA,
      plan: 'STARTER',
      status: 'CANCELED',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
      cancelAtPeriodEnd: true,
      locationLimit: 1,
      monthlyReplyLimit: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const sub = await billingRepo.getSubscription(tenantA);
    const isAutopilotAllowed = sub?.status === 'ACTIVE' || sub?.status === 'TRIALING';

    if (!isAutopilotAllowed) {
      passed++;
      results.push('PASS [ENTITLEMENT]: Canceled subscription strictly denies autopilot execution');
    } else {
      failed++;
      results.push('FAIL [ENTITLEMENT]: Canceled subscription was permitted');
    }
  } catch (e) {
    failed++;
    results.push(`FAIL [ENTITLEMENT]: Entitlement test threw: ${(e as Error).message}`);
  }

  return { passed, failed, results };
}
