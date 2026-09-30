import type {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingInvoice,
} from '../../../shared/types/domain';

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
}

export interface PortalSessionResult {
  portalUrl: string;
}

export interface PaymentSubscriptionState {
  externalSubscriptionId: string;
  externalCustomerId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export type WebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed';

export interface WebhookEventPayload {
  eventId: string;
  eventType: WebhookEventType;
  saasCustomerId: string;
  externalSubscriptionId?: string;
  externalCustomerId?: string;
  plan?: SubscriptionPlan;
  amountCents?: number;
  data: Record<string, unknown>;
}

export interface WebhookProcessResult {
  success: boolean;
  eventId: string;
  eventType: string;
  isDuplicate: boolean;
  event?: WebhookEventPayload;
  error?: string;
}

/**
 * Abstract PaymentProvider interface / base class.
 * Decouples SaaS billing from any single payment vendor (Stripe, Paddle, Adyen, local in-memory mock).
 * Enables multi-jurisdiction payment routing and offline testing.
 */
export abstract class PaymentProvider {
  abstract readonly providerName: string;

  abstract createCustomer(params: {
    saasCustomerId: string;
    email: string;
    name: string;
  }): Promise<{ externalCustomerId: string }>;

  abstract createCheckoutSession(params: {
    saasCustomerId: string;
    externalCustomerId?: string;
    plan: SubscriptionPlan;
    returnUrl: string;
    idempotencyKey?: string;
  }): Promise<CheckoutSessionResult>;

  abstract createPortalSession(params: {
    saasCustomerId: string;
    externalCustomerId: string;
    returnUrl: string;
  }): Promise<PortalSessionResult>;

  abstract getSubscription(externalSubscriptionId: string): Promise<PaymentSubscriptionState>;

  abstract cancelSubscription(
    externalSubscriptionId: string,
    cancelAtPeriodEnd?: boolean
  ): Promise<{ success: boolean; effectiveDate: string; cancelAtPeriodEnd: boolean }>;

  abstract listInvoices(externalCustomerId: string): Promise<BillingInvoice[]>;

  abstract verifyAndParseWebhook(
    rawPayload: string | Buffer,
    signature: string,
    idempotencyKey?: string
  ): Promise<WebhookProcessResult>;
}
