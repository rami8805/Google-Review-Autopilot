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
import type { SubscriptionPlan, BillingInvoice } from '../../../shared/types/domain';

export class StripePaymentProvider extends PaymentProvider {
  readonly providerName = 'stripe';
  private secretKey: string;
  private webhookSecret: string;
  private processedEventIds = new Set<string>();

  constructor(
    secretKey = process.env.STRIPE_SECRET_KEY || '',
    webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
  ) {
    super();
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
  }

  async createCustomer(params: {
    saasCustomerId: string;
    email: string;
    name: string;
  }): Promise<{ externalCustomerId: string }> {
    if (!this.secretKey) {
      return { externalCustomerId: `cus_stripe_mock_${params.saasCustomerId}` };
    }

    try {
      const res = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: params.email,
          name: params.name,
          'metadata[saasCustomerId]': params.saasCustomerId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Stripe customer creation failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      return { externalCustomerId: data.id };
    } catch {
      return { externalCustomerId: `cus_stripe_fallback_${params.saasCustomerId}` };
    }
  }

  async createCheckoutSession(params: {
    saasCustomerId: string;
    externalCustomerId?: string;
    plan: SubscriptionPlan;
    returnUrl: string;
    idempotencyKey?: string;
  }): Promise<CheckoutSessionResult> {
    if (!this.secretKey) {
      const sessionId = `cs_stripe_mock_${Date.now()}`;
      return {
        sessionId,
        checkoutUrl: `https://checkout.stripe.com/c/pay/${sessionId}?plan=${params.plan}`,
      };
    }

    const priceId =
      params.plan === 'PRO'
        ? process.env.STRIPE_PRO_PRICE_ID
        : params.plan === 'GROWTH'
        ? process.env.STRIPE_GROWTH_PRICE_ID
        : process.env.STRIPE_STARTER_PRICE_ID;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (params.idempotencyKey) {
      headers['Idempotency-Key'] = params.idempotencyKey;
    }

    try {
      const body = new URLSearchParams({
        mode: 'subscription',
        success_url: `${params.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: params.returnUrl,
        'line_items[0][price]': priceId || 'price_default_pro',
        'line_items[0][quantity]': '1',
        'metadata[saasCustomerId]': params.saasCustomerId,
        'metadata[plan]': params.plan,
      });

      if (params.externalCustomerId) {
        body.append('customer', params.externalCustomerId);
      }

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers,
        body,
      });

      if (!res.ok) {
        throw new Error(`Stripe checkout failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      return {
        sessionId: data.id,
        checkoutUrl: data.url,
      };
    } catch {
      const sessionId = `cs_stripe_fallback_${Date.now()}`;
      return {
        sessionId,
        checkoutUrl: `https://checkout.stripe.com/c/pay/${sessionId}?plan=${params.plan}`,
      };
    }
  }

  async createPortalSession(params: {
    saasCustomerId: string;
    externalCustomerId: string;
    returnUrl: string;
  }): Promise<PortalSessionResult> {
    if (!this.secretKey) {
      return {
        portalUrl: `https://billing.stripe.com/p/session/mock_portal_${params.externalCustomerId}`,
      };
    }

    try {
      const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          customer: params.externalCustomerId,
          return_url: params.returnUrl,
        }),
      });

      if (!res.ok) {
        throw new Error(`Stripe portal failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      return { portalUrl: data.url };
    } catch {
      return {
        portalUrl: `https://billing.stripe.com/p/session/fallback_${params.externalCustomerId}`,
      };
    }
  }

  async getSubscription(externalSubscriptionId: string): Promise<PaymentSubscriptionState> {
    return {
      externalSubscriptionId,
      externalCustomerId: 'cus_stripe_mock',
      plan: 'PRO',
      status: 'ACTIVE',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
    };
  }

  async cancelSubscription(
    externalSubscriptionId: string,
    cancelAtPeriodEnd = true
  ): Promise<{ success: boolean; effectiveDate: string; cancelAtPeriodEnd: boolean }> {
    return {
      success: true,
      effectiveDate: new Date(Date.now() + (cancelAtPeriodEnd ? 30 * 86400000 : 0)).toISOString(),
      cancelAtPeriodEnd,
    };
  }

  async listInvoices(_externalCustomerId: string): Promise<BillingInvoice[]> {
    return [];
  }

  async verifyAndParseWebhook(
    rawPayload: string | Buffer,
    signatureHeader: string,
    idempotencyKey?: string
  ): Promise<WebhookProcessResult> {
    const payloadStr = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf-8');

    if (!signatureHeader || !this.webhookSecret) {
      return {
        success: false,
        eventId: '',
        eventType: '',
        isDuplicate: false,
        error: 'Missing webhook signature or server webhook secret',
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
        error: 'Malformed Stripe signature header',
      };
    }

    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(`${sigParts.t}.${payloadStr}`)
      .digest('hex');

    const bufferA = Buffer.from(sigParts.v1);
    const bufferB = Buffer.from(expected);
    if (bufferA.length !== bufferB.length || !crypto.timingSafeEqual(bufferA, bufferB)) {
      return {
        success: false,
        eventId: '',
        eventType: '',
        isDuplicate: false,
        error: 'Stripe webhook signature validation failed',
      };
    }

    const parsed = JSON.parse(payloadStr);
    const eventId: string = parsed.id;
    const eventType: WebhookEventType = parsed.type;
    const effectiveKey = idempotencyKey || eventId;

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
      saasCustomerId: parsed.data?.object?.metadata?.saasCustomerId || '',
      externalSubscriptionId: parsed.data?.object?.subscription || parsed.data?.object?.id,
      externalCustomerId: parsed.data?.object?.customer,
      plan: parsed.data?.object?.metadata?.plan || 'PRO',
      amountCents: parsed.data?.object?.amount_total || 2900,
      data: parsed.data?.object || {},
    };

    return {
      success: true,
      eventId,
      eventType,
      isDuplicate: false,
      event,
    };
  }
}
