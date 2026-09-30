import type { Subscription, SubscriptionPlan } from '../../../shared/types/domain.ts';
import { PaddleBillingService } from './paddleService.ts';

export interface IBillingProvider {
  getSubscription(saasCustomerId: string): Promise<Subscription | null>;
  createCheckoutSession(saasCustomerId: string, plan: SubscriptionPlan, returnUrl: string): Promise<{ checkoutUrl: string }>;
  createPortalSession(saasCustomerId: string, returnUrl: string): Promise<{ portalUrl: string }>;
}

export class BillingService implements IBillingProvider {
  private paddleService = new PaddleBillingService();

  async getSubscription(saasCustomerId: string): Promise<Subscription | null> {
    return this.paddleService.getSubscription(saasCustomerId);
  }

  async createCheckoutSession(
    saasCustomerId: string,
    plan: SubscriptionPlan,
    returnUrl: string
  ): Promise<{ checkoutUrl: string }> {
    const priceId = plan === 'PRO' ? 'pri_sandbox_pro_01' : plan === 'GROWTH' ? 'pri_sandbox_growth_01' : 'pri_sandbox_starter_01';
    const txn = await this.paddleService.createTransaction({
      tenantId: saasCustomerId,
      customerEmail: `${saasCustomerId}@customer.com`,
      priceId,
      returnUrl,
    });
    return {
      checkoutUrl: txn.checkoutUrl || `https://sandbox-checkout.paddle.com/checkout/${txn.transactionId}`,
    };
  }

  async createPortalSession(_saasCustomerId: string, _returnUrl: string): Promise<{ portalUrl: string }> {
    return {
      portalUrl: 'https://sandbox-vendors.paddle.com/customer-portal',
    };
  }
}
