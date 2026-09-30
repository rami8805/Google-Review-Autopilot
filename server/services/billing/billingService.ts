import type { Subscription, SubscriptionPlan } from '../../../shared/types/domain';

export interface IBillingProvider {
  getSubscription(saasCustomerId: string): Promise<Subscription>;
  createCheckoutSession(saasCustomerId: string, plan: SubscriptionPlan, returnUrl: string): Promise<{ checkoutUrl: string }>;
  createPortalSession(saasCustomerId: string, returnUrl: string): Promise<{ portalUrl: string }>;
}

export class BillingService implements IBillingProvider {
  async getSubscription(saasCustomerId: string): Promise<Subscription> {
    return {
      id: `sub_${saasCustomerId}`,
      saasCustomerId,
      plan: 'STARTER',
      status: 'ACTIVE',
      currentPeriodStart: new Date(Date.now() - 15 * 86400000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 15 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      locationLimit: 1,
      monthlyReplyLimit: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async createCheckoutSession(
    _saasCustomerId: string,
    plan: SubscriptionPlan,
    _returnUrl: string
  ): Promise<{ checkoutUrl: string }> {
    return {
      checkoutUrl: `https://checkout.stripe.com/pay/mock_session?plan=${plan}`,
    };
  }

  async createPortalSession(_saasCustomerId: string, _returnUrl: string): Promise<{ portalUrl: string }> {
    return {
      portalUrl: 'https://billing.stripe.com/p/session/mock_portal',
    };
  }
}
