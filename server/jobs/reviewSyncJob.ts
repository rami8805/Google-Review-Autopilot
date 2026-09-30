import type {
  Review,
  ReviewReply,
  AutomationRule,
  BrandVoice,
} from '../../shared/types/domain';
import { ReviewWorkflowService } from '../services/workflow/reviewWorkflowService';
import type { IngestionOptions } from '../services/workflow/types';

export interface IngestionResult {
  reviewId: string;
  actionTaken: 'AUTO_PUBLISHED' | 'STAGED_FOR_APPROVAL' | 'GRACE_PERIOD_SCHEDULED';
  riskLevel: string;
}

export class ReviewSyncJob {
  private workflowService: ReviewWorkflowService;

  constructor(workflowService?: ReviewWorkflowService) {
    this.workflowService = workflowService || new ReviewWorkflowService();
  }

  getWorkflowService(): ReviewWorkflowService {
    return this.workflowService;
  }

  /**
   * Process a single review through the safety and automation rule engine.
   */
  async processIngestedReview(params: {
    review: Review;
    brandVoice: BrandVoice;
    rules?: AutomationRule[];
    options?: IngestionOptions;
  }): Promise<{ reply: ReviewReply; result: IngestionResult }> {
    const { review, brandVoice, rules, options } = params;

    const processResult = await this.workflowService.processReview({
      review,
      brandVoice,
      customRules: rules,
      options,
    });

    const isAutoPublished = processResult.reply.status === 'AUTO_PUBLISHED';

    return {
      reply: processResult.reply,
      result: {
        reviewId: review.id,
        actionTaken: isAutoPublished ? 'AUTO_PUBLISHED' : 'STAGED_FOR_APPROVAL',
        riskLevel: processResult.riskAssessment.riskLevel,
      },
    };
  }
}

