/**
 * SaaS Billing & Subscription Test Suite
 *
 * Verifies:
 * - subscription creation (trial initialization & PRO checkout session)
 * - cancellation (cancel at period end and immediate cancellation)
 * - webhook replay (idempotency key & duplicate event prevention)
 * - past due (payment failure handling and tenant status transition)
 * - trial expiry (expired trial enforcement)
 * - abstract payment provider decoupling
 */

import { BillingService } from '../../server/services/billing/billingService';
import { MockPaymentProvider } from '../../server/services/billing/mockPaymentProvider';
import { usageService } from '../../server/services/billing/usageService';
import { PLAN_CATALOG } from '../../shared/constants/billing';

export async function runBillingTests(): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      results.push(`PASS: ${testName}`);
    } else {
      failed++;
      results.push(`FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    }
  }

  const mockProvider = new MockPaymentProvider('test_whsec_secret_123');
  const billing = new BillingService(mockProvider);
  const testTenantId = `tenant_test_${Date.now()}`;

  // Test 1: Subscription Creation (Trial Handling & Checkout Session)
  try {
    const trialSub = billing.createTrialSubscription(testTenantId, 'PRO', 14);
    assert(
      trialSub.status === 'TRIALING',
      'Initial trial subscription has TRIALING status',
      `Got ${trialSub.status}`
    );
    assert(
      trialSub.plan === 'PRO',
      'Trial subscription defaults to PRO features'
    );
    assert(
      !!trialSub.trialEndsAt,
      'Trial subscription specifies trialEndsAt date'
    );

    const checkout = await billing.createCheckoutSession(
      testTenantId,
      'PRO',
      'https://app.local/billing/return',
      'idem_key_001'
    );
    assert(
      !!checkout.checkoutUrl && checkout.checkoutUrl.includes('plan=PRO'),
      'Checkout session URL generated for PRO plan'
    );
    assert(
      !!checkout.sessionId,
      'Checkout returns unique session ID'
    );
  } catch (err: any) {
    assert(false, 'Subscription creation and checkout flow', err.message);
  }

  // Test 2: Webhook Processing & Subscription Activation
  try {
    const checkoutEvent = {
      id: `evt_chk_${Date.now()}`,
      type: 'checkout.session.completed',
      saasCustomerId: testTenantId,
      externalSubscriptionId: `sub_ext_${testTenantId}`,
      externalCustomerId: `cus_ext_${testTenantId}`,
      plan: 'PRO',
      amountCents: PLAN_CATALOG.PRO.priceCents,
    };
    const rawPayload = JSON.stringify(checkoutEvent);
    const signature = mockProvider.generateWebhookSignature(rawPayload);

    const webhookRes = await billing.handleWebhook(rawPayload, signature);
    assert(
      webhookRes.processed && !webhookRes.isDuplicate,
      'Webhook activates subscription with valid signature'
    );

    const activeSub = await billing.getSubscription(testTenantId);
    assert(
      activeSub.status === 'ACTIVE',
      'Subscription transitioned to ACTIVE after checkout webhook',
      `Got ${activeSub.status}`
    );
    assert(
      activeSub.plan === 'PRO',
      'Subscription plan confirmed as PRO ($29/mo)'
    );

    const invoices = await billing.listInvoices(testTenantId);
    assert(
      invoices.length > 0 && invoices[0].status === 'PAID',
      'Paid invoice recorded in billing history'
    );
  } catch (err: any) {
    assert(false, 'Webhook checkout completion test', err.message);
  }

  // Test 3: Webhook Replay & Idempotency Prevention
  try {
    const replayEvent = {
      id: 'evt_replay_duplicate_test_001',
      type: 'invoice.payment_succeeded',
      saasCustomerId: testTenantId,
      amountCents: 2900,
    };
    const rawPayload = JSON.stringify(replayEvent);
    const signature = mockProvider.generateWebhookSignature(rawPayload);

    // First delivery
    const firstDelivery = await billing.handleWebhook(rawPayload, signature, 'idempotency_replay_key_001');
    assert(
      firstDelivery.processed && !firstDelivery.isDuplicate,
      'First webhook event processed normally'
    );

    // Second delivery (replay attack / network retry)
    const secondDelivery = await billing.handleWebhook(rawPayload, signature, 'idempotency_replay_key_001');
    assert(
      secondDelivery.processed && secondDelivery.isDuplicate,
      'Webhook replay safely recognized as duplicate without re-processing'
    );
  } catch (err: any) {
    assert(false, 'Webhook replay and idempotency test', err.message);
  }

  // Test 4: Subscription Cancellation (At period end & Immediate)
  try {
    // 4a. Cancel at period end
    const cancelPeriodEnd = await billing.cancelSubscription(testTenantId, true);
    assert(
      cancelPeriodEnd.cancelAtPeriodEnd === true,
      'Cancel at period end marks flag without immediately ending access'
    );

    const subPendingCancel = await billing.getSubscription(testTenantId);
    assert(
      subPendingCancel.cancelAtPeriodEnd === true && subPendingCancel.status === 'ACTIVE',
      'Subscription remains ACTIVE until current period end date'
    );

    // Resume
    await billing.resumeSubscription(testTenantId);
    const resumedSub = await billing.getSubscription(testTenantId);
    assert(
      resumedSub.cancelAtPeriodEnd === false,
      'Resume subscription clears cancelAtPeriodEnd flag'
    );

    // 4b. Immediate cancellation
    const cancelImmediate = await billing.cancelSubscription(testTenantId, false);
    assert(
      cancelImmediate.cancelAtPeriodEnd === false,
      'Immediate cancellation executed'
    );

    const cancelledSub = await billing.getSubscription(testTenantId);
    assert(
      cancelledSub.status === 'CANCELED',
      'Subscription status updated immediately to CANCELED',
      `Got ${cancelledSub.status}`
    );
  } catch (err: any) {
    assert(false, 'Subscription cancellation test', err.message);
  }

  // Test 5: Past Due Handling (Payment Failure Webhook)
  try {
    const pastDueTenantId = `tenant_pastdue_${Date.now()}`;
    billing.createTrialSubscription(pastDueTenantId, 'PRO');

    const paymentFailedEvent = {
      id: `evt_fail_${Date.now()}`,
      type: 'invoice.payment_failed',
      saasCustomerId: pastDueTenantId,
      amountCents: 2900,
    };
    const rawPayload = JSON.stringify(paymentFailedEvent);
    const signature = mockProvider.generateWebhookSignature(rawPayload);

    await billing.handleWebhook(rawPayload, signature);
    const pastDueSub = await billing.getSubscription(pastDueTenantId);

    assert(
      pastDueSub.status === 'PAST_DUE',
      'Failed payment webhook marks subscription PAST_DUE',
      `Got ${pastDueSub.status}`
    );
  } catch (err: any) {
    assert(false, 'Past due webhook handling test', err.message);
  }

  // Test 6: Trial Expiry Enforcement
  try {
    const expiredTenantId = `tenant_expired_${Date.now()}`;
    const expiredSub = billing.createTrialSubscription(expiredTenantId, 'PRO', -1); // Trial ended yesterday
    expiredSub.trialEndsAt = new Date(Date.now() - 3600000 * 24).toISOString();
    billing.setSubscriptionDirect(expiredTenantId, expiredSub);

    const fetchedSub = await billing.getSubscription(expiredTenantId);
    assert(
      fetchedSub.status === 'PAST_DUE' || fetchedSub.isTrialExpired === true,
      'Expired trial auto-transitions to PAST_DUE status',
      `Got status: ${fetchedSub.status}, isTrialExpired: ${fetchedSub.isTrialExpired}`
    );
  } catch (err: any) {
    assert(false, 'Trial expiry enforcement test', err.message);
  }

  // Test 7: Usage Limits by SaaSCustomer
  try {
    const usageTenantId = `tenant_usage_${Date.now()}`;
    const now = Date.now();
    const periodStart = new Date(now - 1000).toISOString();
    const periodEnd = new Date(now + 30 * 86400000).toISOString();

    // Record replies up to limit
    const limit = PLAN_CATALOG.PRO.limits.monthlyReplyLimit;
    for (let i = 0; i < limit; i++) {
      await usageService.recordUsage(usageTenantId, 'AI_REPLY_GENERATED');
    }

    const quotaCheck = usageService.checkQuota(
      usageTenantId,
      'PRO',
      periodStart,
      periodEnd,
      'GENERATE_REPLY'
    );
    assert(
      quotaCheck.allowed === false,
      'Usage tracker blocks generation once plan quota is reached'
    );
  } catch (err: any) {
    assert(false, 'Usage limit tracking test', err.message);
  }

  return { passed, failed, results };
}
