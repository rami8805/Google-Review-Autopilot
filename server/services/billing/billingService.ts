import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingInvoice,
  PlanDefinition,
} from '../../../shared/types/domain';
import {
  PLAN_CATALOG,
  getPlanDefinition,
  DEFAULT_TRIAL_DURATION_DAYS,
} from '../../../shared/constants/billing';
import { PaymentProvider } from './paymentProvider';
import { MockPaymentProvider } from './mockPaymentProvider';
import { StripePaymentProvider } from './stripePaymentProvider';
import { usageService, CustomerUsageSummary } from './usageService';
import { authService } from '../auth/authService';

export interface SubscriptionWithDetails extends Subscription {
  usage: CustomerUsageSummary;
  planDetails: PlanDefinition;
  isTrialExpired: boolean;
}

export class BillingService {
  private paymentProvider: PaymentProvider;
  private subscriptions = new Map<string, Subscription>();
  private invoices = new Map<string, BillingInvoice[]>();

  constructor(provider?: PaymentProvider) {
    if (provider) {
      this.paymentProvider = provider;
    } else if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder') {
      this.paymentProvider = new StripePaymentProvider();
    } else {
      this.paymentProvider = new MockPaymentProvider();
    }

    this.seedDefaultSubscriptions();
  }

  public getProvider(): PaymentProvider {
    return this.paymentProvider;
  }

  public setProvider(provider: PaymentProvider): void {
    this.paymentProvider = provider;
  }

  private seedDefaultSubscriptions() {
    const demoCustomerId = 'saas_cust_demo_01';
    const now = Date.now();
    const periodStart = new Date(now - 15 * 86400000).toISOString();
    const periodEnd = new Date(now + 15 * 86400000).toISOString();

    const proPlanDef = getPlanDefinition('PRO');

    const demoSub: Subscription = {
      id: `sub_${demoCustomerId}`,
      saasCustomerId: demoCustomerId,
      plan: 'PRO',
      status: 'ACTIVE',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      locationLimit: proPlanDef.limits.locationLimit,
      monthlyReplyLimit: proPlanDef.limits.monthlyReplyLimit,
      paymentProviderName: this.paymentProvider.providerName,
      externalCustomerId: `cus_mock_${demoCustomerId}`,
      externalSubscriptionId: `sub_ext_${demoCustomerId}`,
      createdAt: periodStart,
      updatedAt: periodStart,
    };
    this.subscriptions.set(demoCustomerId, demoSub);

    // Seed demo billing invoices
    this.invoices.set(demoCustomerId, [
      {
        id: 'inv_demo_001',
        saasCustomerId: demoCustomerId,
        externalInvoiceId: 'in_1234567890',
        amountCents: proPlanDef.priceCents,
        currency: proPlanDef.currency,
        status: 'PAID',
        description: `${proPlanDef.name} Plan - Monthly Subscription`,
        hostedInvoiceUrl: 'https://billing.autopilot.mock/inv/demo_001',
        pdfUrl: 'https://billing.autopilot.mock/inv/demo_001.pdf',
        paidAt: periodStart,
        createdAt: periodStart,
      },
    ]);
  }

  public createTrialSubscription(
    saasCustomerId: string,
    plan: SubscriptionPlan = 'PRO',
    durationDays = DEFAULT_TRIAL_DURATION_DAYS
  ): Subscription {
    const now = Date.now();
    const currentPeriodStart = new Date(now).toISOString();
    const currentPeriodEnd = new Date(now + durationDays * 86400000).toISOString();
    const trialEndsAt = currentPeriodEnd;

    const planDef = getPlanDefinition(plan);

    const subscription: Subscription = {
      id: `sub_${saasCustomerId}`,
      saasCustomerId,
      plan,
      status: 'TRIALING',
      currentPeriodStart,
      currentPeriodEnd,
      trialEndsAt,
      cancelAtPeriodEnd: false,
      locationLimit: planDef.limits.locationLimit,
      monthlyReplyLimit: planDef.limits.monthlyReplyLimit,
      paymentProviderName: this.paymentProvider.providerName,
      createdAt: currentPeriodStart,
      updatedAt: currentPeriodStart,
    };

    this.subscriptions.set(saasCustomerId, subscription);
    return subscription;
  }

  public async getSubscription(saasCustomerId: string): Promise<SubscriptionWithDetails> {
    let sub = this.subscriptions.get(saasCustomerId);

    if (!sub) {
      // Auto-create initial trial subscription if not present
      sub = this.createTrialSubscription(saasCustomerId);
    }

    // Check trial expiration
    const isExpired = this.checkAndApplyTrialExpiry(sub);
    const planDetails = getPlanDefinition(sub.plan);
    const usage = usageService.getUsageSummary(
      saasCustomerId,
      sub.plan,
      sub.currentPeriodStart,
      sub.currentPeriodEnd
    );

    return {
      ...sub,
      planDetails,
      usage,
      isTrialExpired: isExpired,
    };
  }

  public checkAndApplyTrialExpiry(sub: Subscription): boolean {
    if (sub.status === 'TRIALING' && sub.trialEndsAt) {
      const now = Date.now();
      const trialEnd = new Date(sub.trialEndsAt).getTime();
      if (now > trialEnd) {
        sub.status = 'PAST_DUE';
        sub.updatedAt = new Date().toISOString();
        authService.updateSaaSCustomerStatus(sub.saasCustomerId, 'PAST_DUE');
        return true;
      }
    }
    return false;
  }

  public async createCheckoutSession(
    saasCustomerId: string,
    plan: SubscriptionPlan,
    returnUrl: string,
    idempotencyKey?: string
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    let sub = this.subscriptions.get(saasCustomerId);
    let externalCustomerId = sub?.externalCustomerId;

    if (!externalCustomerId) {
      const customer = authService.getSaaSCustomer(saasCustomerId);
      const res = await this.paymentProvider.createCustomer({
        saasCustomerId,
        email: customer?.billingEmail || `billing-${saasCustomerId}@example.com`,
        name: customer?.name || `Customer ${saasCustomerId}`,
      });
      externalCustomerId = res.externalCustomerId;
      if (sub) {
        sub.externalCustomerId = externalCustomerId;
      }
    }

    return this.paymentProvider.createCheckoutSession({
      saasCustomerId,
      externalCustomerId,
      plan,
      returnUrl,
      idempotencyKey,
    });
  }

  public async createPortalSession(
    saasCustomerId: string,
    returnUrl: string
  ): Promise<{ portalUrl: string }> {
    const sub = await this.getSubscription(saasCustomerId);
    const externalCustomerId = sub.externalCustomerId || `cus_${saasCustomerId}`;

    return this.paymentProvider.createPortalSession({
      saasCustomerId,
      externalCustomerId,
      returnUrl,
    });
  }

  public async cancelSubscription(
    saasCustomerId: string,
    cancelAtPeriodEnd = true
  ): Promise<{ success: boolean; effectiveDate: string; cancelAtPeriodEnd: boolean }> {
    const sub = this.subscriptions.get(saasCustomerId);
    if (!sub) {
      throw new Error(`SUBSCRIPTION_NOT_FOUND: No active subscription for customer ${saasCustomerId}`);
    }

    const nowIso = new Date().toISOString();

    if (cancelAtPeriodEnd) {
      sub.cancelAtPeriodEnd = true;
      sub.cancelledAt = nowIso;
      sub.updatedAt = nowIso;

      if (sub.externalSubscriptionId) {
        await this.paymentProvider.cancelSubscription(sub.externalSubscriptionId, true);
      }

      return {
        success: true,
        effectiveDate: sub.currentPeriodEnd,
        cancelAtPeriodEnd: true,
      };
    } else {
      sub.status = 'CANCELED';
      sub.cancelAtPeriodEnd = false;
      sub.cancelledAt = nowIso;
      sub.updatedAt = nowIso;

      authService.updateSaaSCustomerStatus(saasCustomerId, 'CANCELLED');

      if (sub.externalSubscriptionId) {
        await this.paymentProvider.cancelSubscription(sub.externalSubscriptionId, false);
      }

      return {
        success: true,
        effectiveDate: nowIso,
        cancelAtPeriodEnd: false,
      };
    }
  }

  public async resumeSubscription(saasCustomerId: string): Promise<Subscription> {
    const sub = this.subscriptions.get(saasCustomerId);
    if (!sub) {
      throw new Error('SUBSCRIPTION_NOT_FOUND');
    }

    if (sub.cancelAtPeriodEnd) {
      sub.cancelAtPeriodEnd = false;
      sub.cancelledAt = undefined;
      sub.updatedAt = new Date().toISOString();
    }

    return sub;
  }

  public async listInvoices(saasCustomerId: string): Promise<BillingInvoice[]> {
    const sub = this.subscriptions.get(saasCustomerId);
    const localInvoices = this.invoices.get(saasCustomerId) || [];

    if (sub?.externalCustomerId) {
      try {
        const providerInvoices = await this.paymentProvider.listInvoices(sub.externalCustomerId);
        if (providerInvoices.length > 0) {
          return providerInvoices;
        }
      } catch {
        // Fall back to local records
      }
    }

    return localInvoices;
  }

  public addInvoice(saasCustomerId: string, invoice: BillingInvoice): void {
    const list = this.invoices.get(saasCustomerId) || [];
    list.unshift(invoice);
    this.invoices.set(saasCustomerId, list);
  }

  public async handleWebhook(
    rawPayload: string | Buffer,
    signatureHeader: string,
    idempotencyKey?: string
  ): Promise<{
    processed: boolean;
    isDuplicate: boolean;
    eventType: string;
    saasCustomerId?: string;
    error?: string;
  }> {
    const result = await this.paymentProvider.verifyAndParseWebhook(
      rawPayload,
      signatureHeader,
      idempotencyKey
    );

    if (!result.success) {
      return {
        processed: false,
        isDuplicate: false,
        eventType: '',
        error: result.error || 'Webhook verification failed',
      };
    }

    if (result.isDuplicate) {
      return {
        processed: true,
        isDuplicate: true,
        eventType: result.eventType,
      };
    }

    const event = result.event;
    if (!event) {
      return {
        processed: false,
        isDuplicate: false,
        eventType: result.eventType,
        error: 'Missing event payload',
      };
    }

    const { eventType, saasCustomerId, externalSubscriptionId, externalCustomerId, plan } = event;
    const now = Date.now();
    const nowIso = new Date().toISOString();

    let sub = saasCustomerId ? this.subscriptions.get(saasCustomerId) : undefined;

    switch (eventType) {
      case 'checkout.session.completed':
      case 'customer.subscription.created': {
        const targetPlan = plan || 'PRO';
        const planDef = getPlanDefinition(targetPlan);
        const periodStart = nowIso;
        const periodEnd = new Date(now + 30 * 86400000).toISOString();

        if (sub) {
          sub.plan = targetPlan;
          sub.status = 'ACTIVE';
          sub.currentPeriodStart = periodStart;
          sub.currentPeriodEnd = periodEnd;
          sub.cancelAtPeriodEnd = false;
          sub.trialEndsAt = undefined;
          sub.locationLimit = planDef.limits.locationLimit;
          sub.monthlyReplyLimit = planDef.limits.monthlyReplyLimit;
          sub.externalSubscriptionId = externalSubscriptionId || sub.externalSubscriptionId;
          sub.externalCustomerId = externalCustomerId || sub.externalCustomerId;
          sub.updatedAt = nowIso;
        } else if (saasCustomerId) {
          sub = {
            id: `sub_${saasCustomerId}`,
            saasCustomerId,
            plan: targetPlan,
            status: 'ACTIVE',
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            locationLimit: planDef.limits.locationLimit,
            monthlyReplyLimit: planDef.limits.monthlyReplyLimit,
            externalSubscriptionId,
            externalCustomerId,
            paymentProviderName: this.paymentProvider.providerName,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          this.subscriptions.set(saasCustomerId, sub);
        }

        if (saasCustomerId) {
          authService.updateSaaSCustomerStatus(saasCustomerId, 'ACTIVE');

          // Add paid invoice
          this.addInvoice(saasCustomerId, {
            id: `inv_${Date.now()}`,
            saasCustomerId,
            externalInvoiceId: `in_${Date.now()}`,
            amountCents: planDef.priceCents,
            currency: planDef.currency,
            status: 'PAID',
            description: `${planDef.name} Subscription - Payment Received`,
            paidAt: nowIso,
            createdAt: nowIso,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        if (sub) {
          if (plan) {
            sub.plan = plan;
            const planDef = getPlanDefinition(plan);
            sub.locationLimit = planDef.limits.locationLimit;
            sub.monthlyReplyLimit = planDef.limits.monthlyReplyLimit;
          }
          sub.status = 'ACTIVE';
          sub.updatedAt = nowIso;
        }
        break;
      }

      case 'customer.subscription.deleted': {
        if (sub) {
          sub.status = 'CANCELED';
          sub.cancelAtPeriodEnd = false;
          sub.cancelledAt = nowIso;
          sub.updatedAt = nowIso;
        }
        if (saasCustomerId) {
          authService.updateSaaSCustomerStatus(saasCustomerId, 'CANCELLED');
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        if (sub) {
          sub.status = 'ACTIVE';
          sub.updatedAt = nowIso;
        }
        if (saasCustomerId) {
          authService.updateSaaSCustomerStatus(saasCustomerId, 'ACTIVE');
          const planDef = getPlanDefinition(sub?.plan || 'PRO');
          this.addInvoice(saasCustomerId, {
            id: `inv_${Date.now()}`,
            saasCustomerId,
            externalInvoiceId: `in_${Date.now()}`,
            amountCents: event.amountCents || planDef.priceCents,
            currency: planDef.currency,
            status: 'PAID',
            description: `${planDef.name} Monthly Renewal - Successful`,
            paidAt: nowIso,
            createdAt: nowIso,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        if (sub) {
          sub.status = 'PAST_DUE';
          sub.updatedAt = nowIso;
        }
        if (saasCustomerId) {
          authService.updateSaaSCustomerStatus(saasCustomerId, 'PAST_DUE');
          const planDef = getPlanDefinition(sub?.plan || 'PRO');
          this.addInvoice(saasCustomerId, {
            id: `inv_${Date.now()}`,
            saasCustomerId,
            externalInvoiceId: `in_failed_${Date.now()}`,
            amountCents: event.amountCents || planDef.priceCents,
            currency: planDef.currency,
            status: 'OPEN',
            description: `${planDef.name} Monthly Renewal - Payment Failed`,
            createdAt: nowIso,
          });
        }
        break;
      }
    }

    return {
      processed: true,
      isDuplicate: false,
      eventType,
      saasCustomerId,
    };
  }

  // Internal test helper to simulate manual subscription updates
  public setSubscriptionDirect(saasCustomerId: string, subscription: Subscription): void {
    this.subscriptions.set(saasCustomerId, subscription);
  }
}

export const billingService = new BillingService();
