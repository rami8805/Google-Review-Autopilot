import type {
  Review,
  ReviewReply,
  AutomationRule,
  BrandVoice,
} from '../../shared/types/domain';
import { DEFAULT_AUTOMATION_RULES, RISK_LEVEL_SEVERITY } from '../../shared/constants/automation';
import { GeminiAiReplyEngine } from '../services/ai/aiReplyEngine';
import { GoogleBusinessProfileService } from '../services/google/googleProfileProvider';
import { NotificationService } from '../services/notifications/notificationService';

export interface IngestionResult {
  reviewId: string;
  actionTaken: 'AUTO_PUBLISHED' | 'STAGED_FOR_APPROVAL' | 'GRACE_PERIOD_SCHEDULED';
  riskLevel: string;
}

export class ReviewSyncJob {
  private aiEngine: GeminiAiReplyEngine;
  private googleService: GoogleBusinessProfileService;
  private notificationService: NotificationService;

  constructor() {
    this.aiEngine = new GeminiAiReplyEngine();
    this.googleService = new GoogleBusinessProfileService();
    this.notificationService = new NotificationService();
  }

  /**
   * Process a single review through the safety and automation rule engine.
   */
  async processIngestedReview(params: {
    review: Review;
    brandVoice: BrandVoice;
    rules?: AutomationRule[];
  }): Promise<{ reply: ReviewReply; result: IngestionResult }> {
    const { review, brandVoice, rules } = params;

    // Phase 1: Risk Assessment
    const riskAssessment = await this.aiEngine.assessRisk(review.comment || '', review.starRating);
    review.riskAssessment = riskAssessment;

    // Phase 2: AI Reply Draft Generation (Strictly guarded)
    const { proposedText, model } = await this.aiEngine.generateReplyDraft({
      reviewText: review.comment || '',
      authorName: review.author.displayName,
      rating: review.starRating,
      brandVoice,
      riskAssessment,
    });

    // Phase 3: Evaluate Automation Rules
    // Rule matching by star rating
    const matchingRule = rules?.find((r) => r.starRating === review.starRating && r.isActive) ||
      DEFAULT_AUTOMATION_RULES.find((r) => r.starRating === review.starRating);

    let isEligibleForAutoPublish = false;

    if (matchingRule && matchingRule.action === 'AUTO_PUBLISH') {
      const currentRiskSeverity = RISK_LEVEL_SEVERITY[riskAssessment.riskLevel];
      const maxAllowedSeverity = RISK_LEVEL_SEVERITY[matchingRule.maxRiskLevelForAutoPublish];

      // Auto publish is permitted ONLY if risk level does not exceed rule limit AND is not HIGH/CRITICAL
      if (
        currentRiskSeverity <= maxAllowedSeverity &&
        riskAssessment.riskLevel !== 'HIGH' &&
        riskAssessment.riskLevel !== 'CRITICAL'
      ) {
        isEligibleForAutoPublish = true;
      }
    }

    const reply: ReviewReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reviewId: review.id,
      saasCustomerId: review.saasCustomerId,
      businessLocationId: review.businessLocationId,
      proposedText,
      status: isEligibleForAutoPublish ? 'AUTO_PUBLISHED' : 'PENDING_APPROVAL',
      generatedByAi: true,
      aiModel: model,
      publishedAt: isEligibleForAutoPublish ? new Date().toISOString() : undefined,
      publishedText: isEligibleForAutoPublish ? proposedText : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isEligibleForAutoPublish) {
      // Dispatch reply to Google Business Profile API
      try {
        await this.googleService.publishReviewReply(
          'mock_access_token',
          review.googleReviewName,
          proposedText
        );
      } catch (err) {
        reply.status = 'FAILED_TO_PUBLISH';
        reply.publishErrorMessage = (err as Error).message;
      }
    } else {
      // Alert SaaSCustomer that approval is required
      await this.notificationService.notifyApprovalRequired(
        review.saasCustomerId,
        review.author.displayName,
        review.starRating,
        review.id
      );
    }

    return {
      reply,
      result: {
        reviewId: review.id,
        actionTaken: isEligibleForAutoPublish ? 'AUTO_PUBLISHED' : 'STAGED_FOR_APPROVAL',
        riskLevel: riskAssessment.riskLevel,
      },
    };
  }
}
