import React from 'react';
import { ApprovalQueue } from '../features/reviews/ApprovalQueue';
import type { Review, ReviewReply } from '../../shared/types/domain';

interface ReviewsPageProps {
  reviews: (Review & { reply?: ReviewReply })[];
  onApprove: (reviewId: string, editedText?: string) => Promise<void>;
  onRegenerate: (reviewId: string) => Promise<void>;
}

export const ReviewsPage: React.FC<ReviewsPageProps> = ({ reviews, onApprove, onRegenerate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ApprovalQueue reviews={reviews} onApprove={onApprove} onRegenerate={onRegenerate} />
    </div>
  );
};
