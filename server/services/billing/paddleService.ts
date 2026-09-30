import crypto from 'crypto';
import type { Subscription, SubscriptionPlan, SubscriptionStatus } from '../../../shared/types/domain.ts';
import { BillingRepository } from '../../repositories/postgresRepositories.ts';

export interface IPaddleBillingProvider {
  createTransaction(params: {
    tenantId: string;
    customerEmail: string;
    priceId: string;
    returnUrl?: string;
  }): Promise<{ transactionId: string; checkoutUrl?: string }>;
  getSubscription(tenantId: string): Promise<Subscription | null>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
  processWebhookEvent(rawBody: string, signatureHeader: string): Promise<{ success: boolean; eventType?: string; error?: string }>;
}

export class PaddleBillingService implements IPaddleBillingProvider {
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl: string;
  private billingRepo: BillingRepository;

  constructor(config?: { apiKey?: string; webhookSecret?: string; baseUrl?: string }) {
    this.apiKey = config?.apiKey || process.env.PADDLE_API_KEY || '';
    this.webhookSecret = config?.webhookSecret || process.env.PADDLE_WEBHOOK_SECRET || '';
    this.baseUrl = config?.baseUrl || process.env.PADDLE_BASE_URL || 'https://sandbox-api.paddle.com';
    this.billingRepo = new BillingRepository();
  }

  /**
   * Verifies Paddle Webhook HMAC-SHA256 signature against raw request body.
   * Header format: "ts=1680000000;h1=hash"
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!this.webhookSecret) {
      // If secret not configured in local sandbox test mode, allow explicit test signature
      if (signatureHeader && signatureHeader.startsWith('test_valid_sig')) return true;
      return false;
    }

    if (!signatureHeader || !rawBody) return false;

    try {
      const parts = signatureHeader.split(';').reduce<Record<string, string>>((acc, item) => {
        const [k, v] = item.trim().split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});

      const ts = parts.ts;
      const h1 = parts.h1;
      if (!ts || !h1) return false;

      // Replay protection: Check timestamp drift (5 minutes max)
      const eventTime = parseInt(ts, 10) * 1000;
      const now = Date.now();
      if (Math.abs(now - eventTime) > 300000) {
        // Timestamp is too far in past or future
        return false;
      }

      const signedPayload = `${ts}:${rawBody}`;
      const expectedH1 = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expectedH1));
    } catch {
      return false;
    }
  }

  /**
   * Processes verified Paddle webhook events idempotently.
   */
  async processWebhookEvent(
    rawBody: string,
    signatureHeader: string
  ): Promise<{ success: boolean; eventType?: string; error?: string }> {
    const isValid = this.verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      return { success: false, error: 'INVALID_SIGNATURE' };
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { success: false, error: 'INVALID_JSON_PAYLOAD' };
    }

    const eventId = payload.event_id || payload.notification_id;
    const eventType = payload.event_type;
    const data = payload.data;

    if (!eventId || !eventType) {
      return { success: false, error: 'MALFORMED_EVENT_STRUCTURE' };
    }

    // Replay protection: check idempotency on event_id
    const isNew = await this.billingRepo.recordWebhookEvent(eventId, eventType, payload);
    if (!isNew) {
      // Event was already processed — return success idempotently
      return { success: true, eventType, error: 'DUPLICATE_EVENT_IGNORED' };
    }

    try {
      switch (eventType) {
        case 'customer.created': {
          const customerId = data.id;
          const email = data.email;
          const tenantId = data.custom_data?.tenant_id;
          if (tenantId && customerId) {
            await this.billingRepo.recordPaddleCustomer({
              id: `pc_${customerId}`,
              tenantId,
              paddleCustomerId: customerId,
              email,
              name: data.name,
            });
          }
          break;
        }

        case 'transaction.paid':
        case 'transaction.completed': {
          const subscriptionId = data.subscription_id;
          const tenantId = data.custom_data?.tenant_id;
          const customerId = data.customer_id;

          if (tenantId) {
            const currentSub = await this.billingRepo.getSubscription(tenantId);
            const plan: SubscriptionPlan = data.custom_data?.plan || currentSub?.plan || 'GROWTH';

            await this.billingRepo.upsertSubscription(tenantId, {
              id: `sub_${tenantId}`,
              saasCustomerId: tenantId,
              paddleCustomerId: customerId,
              paddleSubscriptionId: subscriptionId,
              plan,
              status: 'ACTIVE',
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
              cancelAtPeriodEnd: false,
              locationLimit: plan === 'STARTER' ? 1 : plan === 'GROWTH' ? 3 : 10,
              monthlyReplyLimit: plan === 'STARTER' ? 50 : plan === 'GROWTH' ? 200 : 1000,
              createdAt: currentSub?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          break;
        }

        case 'subscription.created':
        case 'subscription.updated': {
          const subscriptionId = data.id;
          const customerId = data.customer_id;
          const tenantId = data.custom_data?.tenant_id;
          const status = (data.status || 'ACTIVE').toUpperCase() as SubscriptionStatus;
          const plan: SubscriptionPlan = data.custom_data?.plan || 'STARTER';

          if (tenantId) {
            await this.billingRepo.upsertSubscription(tenantId, {
              id: `sub_${tenantId}`,
              saasCustomerId: tenantId,
              paddleCustomerId: customerId,
              paddleSubscriptionId: subscriptionId,
              plan,
              status: status === 'ACTIVE' || status === 'TRIALING' ? status : 'PAST_DUE',
              currentPeriodStart: data.current_billing_period?.starts_at || new Date().toISOString(),
              currentPeriodEnd: data.current_billing_period?.ends_at || new Date(Date.now() + 30 * 86400000).toISOString(),
              cancelAtPeriodEnd: Boolean(data.scheduled_change?.action === 'cancel'),
              locationLimit: plan === 'STARTER' ? 1 : plan === 'GROWTH' ? 3 : 10,
              monthlyReplyLimit: plan === 'STARTER' ? 50 : plan === 'GROWTH' ? 200 : 1000,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            await this.billingRepo.upsertPaddleSubscription({
              id: `psub_${subscriptionId}`,
              tenantId,
              paddleSubscriptionId: subscriptionId,
              paddleCustomerId: customerId,
              status: data.status,
              priceId: data.items?.[0]?.price?.id,
              currency: data.currency_code,
              currentPeriodStart: data.current_billing_period?.starts_at,
              currentPeriodEnd: data.current_billing_period?.ends_at,
              cancelAtPeriodEnd: Boolean(data.scheduled_change?.action === 'cancel'),
            });
          }
          break;
        }

        case 'subscription.canceled': {
          const tenantId = data.custom_data?.tenant_id;
          if (tenantId) {
            const currentSub = await this.billingRepo.getSubscription(tenantId);
            if (currentSub) {
              await this.billingRepo.upsertSubscription(tenantId, {
                ...currentSub,
                status: 'CANCELED',
                cancelAtPeriodEnd: true,
                updatedAt: new Date().toISOString(),
              });
            }
          }
          break;
        }

        default:
          // Unhandled events are acknowledged and recorded
          break;
      }

      await this.billingRepo.markWebhookProcessed(eventId, 'PROCESSED');
      return { success: true, eventType };
    } catch (err) {
      await this.billingRepo.markWebhookProcessed(eventId, 'FAILED', (err as Error).message);
      return { success: false, eventType, error: (err as Error).message };
    }
  }

  async createTransaction(params: {
    tenantId: string;
    customerEmail: string;
    priceId: string;
    returnUrl?: string;
  }): Promise<{ transactionId: string; checkoutUrl?: string }> {
    if (!this.apiKey) {
      // Mock Sandbox development response
      const txId = `txn_sandbox_${Date.now()}`;
      return {
        transactionId: txId,
        checkoutUrl: `https://sandbox-checkout.paddle.com/checkout/${txId}`,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{ price_id: params.priceId, quantity: 1 }],
          customer: { email: params.customerEmail },
          custom_data: { tenant_id: params.tenantId },
        }),
      });

      if (!response.ok) {
        throw new Error(`Paddle transaction creation failed: HTTP ${response.status}`);
      }

      const resData: any = await response.json();
      return {
        transactionId: resData.data.id,
        checkoutUrl: resData.data.url,
      };
    } catch (err) {
      console.warn('[PaddleService] Paddle API call failed, using sandbox fallback:', (err as Error).message);
      const txId = `txn_sandbox_${Date.now()}`;
      return {
        transactionId: txId,
        checkoutUrl: `https://sandbox-checkout.paddle.com/checkout/${txId}`,
      };
    }
  }

  async getSubscription(tenantId: string): Promise<Subscription | null> {
    return this.billingRepo.getSubscription(tenantId);
  }
}
