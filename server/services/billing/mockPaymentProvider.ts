import crypto from 'crypto';
import {
  PaymentProvider,
  CheckoutSessionResult,
  PortalSessionResult,
  PaymentSubscriptionState,
  WebhookProcessResult,
  WebhookEventPayload,
  WebhookEventType,
} from './paymentProvider';
import type { SubscriptionPlan, SubscriptionStatus, BillingInvoice } from '../../../shared/types/domain';
import { getPlanDefinition } from '../../../shared/constants/billing';

export class MockPaymentProvider extends PaymentProvider {
  readonly providerName = 'mock_provider';
  private webhookSecret: string;
  private processedEventIds = new Set<string>();
  private idempotencyStore = new Map<string, any>();
  private customerStore = new Map<string, { externalCustomerId: string; email: string; name: string }>();
  private subscriptionStore = new Map<string, PaymentSubscriptionState>();
  private invoiceStore = new Map<string, BillingInvoice[]>();

  constructor(webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_autopilot_safe_secret_key_123') {
    super();
    this.webhookSecret = webhookSecret;
  }

  async createCustomer(params: {
    saasCustomerId: string;
    email: string;
    name: string;
  }): Promise<{ externalCustomerId: string }> {
    const existing = this.customerStore.get(params.saasCustomerId);
    if (existing) {
      return { externalCustomerId: existing.externalCustomerId };
    }

    const externalCustomerId = `cus_mock_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    this.customerStore.set(params.saasCustomerId, {
      externalCustomerId,
      email: params.email,
      name: params.name,
    });
    return { externalCustomerId };
  }

  async createCheckoutSession(params: {
    saasCustomerId: string;
    externalCustomerId?: string;
    plan: SubscriptionPlan;
    returnUrl: string;
    idempotencyKey?: string;
  }): Promise<CheckoutSessionResult> {
    if (params.idempotencyKey && this.idempotencyStore.has(params.idempotencyKey)) {
      return this.idempotencyStore.get(params.idempotencyKey);
    }

    const sessionId = `cs_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const result: CheckoutSessionResult = {
      sessionId,
      checkoutUrl: `https://checkout.autopilot.mock/pay/${sessionId}?plan=${params.plan}&tenant=${params.saasCustomerId}`,
    };

    if (params.idempotencyKey) {
      this.idempotencyStore.set(params.idempotencyKey, result);
    }
    return result;
  }

  async createPortalSession(params: {
    saasCustomerId: string;
    externalCustomerId: string;
    returnUrl: string;
  }): Promise<PortalSessionResult> {
    const portalUrl = `https://billing.autopilot.mock/p/session/${params.externalCustomerId}?return_url=${encodeURIComponent(params.returnUrl)}`;
    return { portalUrl };
  }

  async getSubscription(externalSubscriptionId: string): Promise<PaymentSubscriptionState> {
    const sub = this.subscriptionStore.get(externalSubscriptionId);
    if (!sub) {
      throw new Error(`SUBSCRIPTION_NOT_FOUND: External subscription ${externalSubscriptionId} not found`);
    }
    return sub;
  }

  async cancelSubscription(
    externalSubscriptionId: string,
    cancelAtPeriodEnd = true
  ): Promise<{ success: boolean; effectiveDate: string; cancelAtPeriodEnd: boolean }> {
    let sub = this.subscriptionStore.get(externalSubscriptionId);
    if (!sub) {
      sub = {
        externalSubscriptionId,
        externalCustomerId: 'cus_mock',
        plan: 'PRO',
        status: 'ACTIVE',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
      };
      this.subscriptionStore.set(externalSubscriptionId, sub);
    }

    if (cancelAtPeriodEnd) {
      sub.cancelAtPeriodEnd = true;
      return {
        success: true,
        effectiveDate: sub.currentPeriodEnd,
        cancelAtPeriodEnd: true,
      };
    } else {
      sub.status = 'CANCELED';
      sub.cancelAtPeriodEnd = false;
      return {
        success: true,
        effectiveDate: new Date().toISOString(),
        cancelAtPeriodEnd: false,
      };
    }
  }

  async listInvoices(externalCustomerId: string): Promise<BillingInvoice[]> {
    return this.invoiceStore.get(externalCustomerId) || [];
  }

  /**
   * Generates a valid HMAC-SHA256 signature for test or internal webhook events
   */
  public generateWebhookSignature(payload: string, secret?: string): string {
    const key = secret || this.webhookSecret;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHmac('sha256', key).update(`${timestamp}.${payload}`).digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }

  /**
   * Verifies incoming webhook signature and checks idempotency
   */
  async verifyAndParseWebhook(
    rawPayload: string | Buffer,
    signatureHeader: string,
    idempotencyKey?: string
  ): Promise<WebhookProcessResult> {
    const payloadStr = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf-8');

    // 1. Signature Verification
    if (!signatureHeader) {
      return {
        success: false,
        eventId: '',
        eventType: '',
        isDuplicate: false,
        error: 'Missing webhook signature header',
      };
    }

    const sigParts = signatureHeader.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=');
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {} as Record<string, string>);

    if (!sigParts.t || !sigParts.v1) {
      return {
        success: false,
        eventId: '',
        eventType: '',
        isDuplicate: false,
        error: 'Malformed signature header',
      };
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(`${sigParts.t}.${payloadStr}`)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const bufferA = Buffer.from(sigParts.v1);
    const bufferB = Buffer.from(expectedSignature);
    if (bufferA.length !== bufferB.length || !crypto.timingSafeEqual(bufferA, bufferB)) {
      return {
        success: false,
        eventId: '',
        eventType: '',
        isDuplicate: false,
        error: 'Invalid webhook signature',
      };
    }

    // 2. Parse payload
    let parsed: any;
    try {
      parsed = JSON.parse(payloadStr);
    } catch {
      return {
        success: false,
        eventId: '',
        eventType: '',
        isDuplicate: false,
        error: 'Invalid JSON payload',
      };
    }

    const eventId: string = parsed.id || parsed.eventId || `evt_${Date.now()}`;
    const eventType: WebhookEventType = parsed.type || parsed.eventType || 'checkout.session.completed';
    const effectiveKey = idempotencyKey || eventId;

    // 3. Idempotency Check: prevent duplicate webhook replay
    if (this.processedEventIds.has(effectiveKey)) {
      return {
        success: true,
        eventId,
        eventType,
        isDuplicate: true,
      };
    }

    this.processedEventIds.add(effectiveKey);

    const event: WebhookEventPayload = {
      eventId,
      eventType,
      saasCustomerId: parsed.saasCustomerId || parsed.data?.object?.metadata?.saasCustomerId || '',
      externalSubscriptionId: parsed.externalSubscriptionId || parsed.data?.object?.subscription,
      externalCustomerId: parsed.externalCustomerId || parsed.data?.object?.customer,
      plan: parsed.plan || parsed.data?.object?.metadata?.plan,
      amountCents: parsed.amountCents || parsed.data?.object?.amount_total,
      data: parsed.data || parsed,
    };

    return {
      success: true,
      eventId,
      eventType,
      isDuplicate: false,
      event,
    };
  }

  // Internal test helper to register mock subscriptions
  public registerMockSubscription(sub: PaymentSubscriptionState) {
    this.subscriptionStore.set(sub.externalSubscriptionId, sub);
  }

  // Internal test helper to add mock invoices
  public addMockInvoice(externalCustomerId: string, invoice: BillingInvoice) {
    const list = this.invoiceStore.get(externalCustomerId) || [];
    list.push(invoice);
    this.invoiceStore.set(externalCustomerId, list);
  }
}
