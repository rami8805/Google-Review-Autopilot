import React from 'react';
import { SubscriptionPlanCard } from '../features/billing/SubscriptionPlanCard';
import type { Subscription, SubscriptionPlan, SubscriptionStatus } from '../../shared/types/domain';

interface BillingPageProps {
  subscription: Subscription;
  onUpdateSubscription?: (plan?: SubscriptionPlan) => Promise<void>;
}

export const BillingPage: React.FC<BillingPageProps> = ({ subscription, onUpdateSubscription }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SubscriptionPlanCard
        subscription={subscription}
        onUpdateSubscription={onUpdateSubscription}
      />
    </div>
  );
};
