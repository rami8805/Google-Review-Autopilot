import React from 'react';
import { SubscriptionPlanCard } from '../features/billing/SubscriptionPlanCard';
import type { Subscription } from '../../shared/types/domain';

interface BillingPageProps {
  subscription: Subscription;
}

export const BillingPage: React.FC<BillingPageProps> = ({ subscription }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SubscriptionPlanCard subscription={subscription} />
    </div>
  );
};
