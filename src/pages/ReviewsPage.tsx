import React from 'react';
import { ApprovalQueue } from '../features/reviews/ApprovalQueue';
import type { Review, ReviewReply } from '../../shared/types/domain';

interface ReviewsPageProps {
  reviews: (Review & { reply?: ReviewReply })[];
  isAutomationPaused: boolean;
  onApprove: (reviewId: string, editedText?: string) => Promise<void>;
  onRegenerate: (reviewId: string) => Promise<void>;
  onReject: (reviewId: string) => Promise<void>;
  onToggleAutomation: () => void;
  isLoading?: boolean;
}

export const ReviewsPage: React.FC<ReviewsPageProps> = ({
  reviews,
  isAutomationPaused,
  onApprove,
  onRegenerate,
  onReject,
  onToggleAutomation,
  isLoading,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ApprovalQueue
        reviews={reviews}
        isAutomationPaused={isAutomationPaused}
        onApprove={onApprove}
        onRegenerate={onRegenerate}
        onReject={onReject}
        onToggleAutomation={onToggleAutomation}
        isLoading={isLoading}
      />
    </div>
  );
};
