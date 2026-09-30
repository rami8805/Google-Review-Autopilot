import React from 'react';
import { DashboardMetrics } from '../features/dashboard/DashboardMetrics';
import type { Review, ReviewReply, BusinessLocation, Subscription } from '../../shared/types/domain';

interface DashboardPageProps {
  reviews: (Review & { reply?: ReviewReply })[];
  location: BusinessLocation;
  subscription: Subscription;
  onOpenApprovalQueue: () => void;
  onSyncReviews: () => void;
  isSyncing: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  reviews,
  location,
  subscription,
  onOpenApprovalQueue,
  onSyncReviews,
  isSyncing,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardMetrics
        reviews={reviews}
        location={location}
        subscription={subscription}
        onOpenApprovalQueue={onOpenApprovalQueue}
        onSyncReviews={onSyncReviews}
        isSyncing={isSyncing}
      />
    </div>
  );
};
