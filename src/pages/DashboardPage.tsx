import React from 'react';
import { DashboardMetrics } from '../features/dashboard/DashboardMetrics';
import type { Review, ReviewReply } from '../../shared/types/domain';

interface DashboardPageProps {
  reviews: (Review & { reply?: ReviewReply })[];
  onOpenApprovalQueue: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ reviews, onOpenApprovalQueue }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardMetrics reviews={reviews} onOpenApprovalQueue={onOpenApprovalQueue} />
    </div>
  );
};
