import type {
  Review,
  ReviewReply,
  AutomationRule,
  BrandVoice,
  GuardDecision,
} from '../../shared/types/domain';
import { DEFAULT_AUTOMATION_RULES, RISK_LEVEL_SEVERITY } from '../../shared/constants/automation';
import { GeminiAiReplyEngine } from '../services/ai/aiReplyEngine';
import { GoogleBusinessProfileService } from '../services/google/googleProfileProvider';
import { NotificationService } from '../services/notifications/notificationService';
import { GoogleConnectionRepository } from '../repositories/postgresRepositories.ts';
import { ReplyGuardService } from '../services/workflow/replyGuardService';

export interface IngestionResult {
  reviewId: string;
  actionTaken: 'AUTO_PUBLISHED' | 'STAGED_FOR_APPROVAL' | 'GRACE_PERIOD_SCHEDULED';
  riskLevel: string;
  guardDecision?: GuardDecision;
  customerExplanation?: string;
  regenerationCount?: number;
}

export class ReviewSyncJob {
  private aiEngine: GeminiAiReplyEngine;
  private googleService: GoogleBusinessProfileService;
  private notificationService: NotificationService;
  private replyGuard: ReplyGuardService;
  private googleRepo: GoogleConnectionRepository;

  constructor() {
    this.aiEngine = new GeminiAiReplyEngine();
    this.googleService = new GoogleBusinessProfileService();
    this.notificationService = new NotificationService();
    this.replyGuard = new ReplyGuardService();
    this.googleRepo = new GoogleConnectionRepository();
  }

  /**
   * Process a single review through AI generation, the Reply Guard safety layer, and the automation rule engine.
   */
  async processIngestedReview(params: {
    review: Review;
    brandVoice: BrandVoice;
    rules?: AutomationRule[];
    recentReplies?: Array<{ proposedText: string; publishedText?: string }>;
  }): Promise<{ reply: ReviewReply; result: IngestionResult }> {
    const { review, brandVoice, rules, recentReplies = [] } = params;

    // Phase 1: Risk Assessment
    const riskAssessment = await this.aiEngine.assessRisk(review.comment || '', review.starRating);
    review.riskAssessment = riskAssessment;

    // Phase 2: AI Reply Draft Generation
    let { proposedText, model } = await this.aiEngine.generateReplyDraft({
      reviewText: review.comment || '',
      authorName: review.author.displayName,
      rating: review.starRating,
      brandVoice,
      riskAssessment,
    });

    // Phase 3: Reply Guard Safety Layer (Gate 1)
    let guardResult = await this.replyGuard.validateReply({
      review,
      generatedReply: proposedText,
      businessContext: brandVoice.trustedBusinessContext,
      brandVoice,
      recentReplies,
      automationRules: rules,
      regenerationAttempts: 0,
    });

    let regenerationCount = 0;

    // Phase 4: Single-Turn Regeneration if Reply Guard flags fixable issue
    if (guardResult.decision === 'BLOCK_AND_REGENERATE' && guardResult.regenerationAllowed) {
      regenerationCount = 1;
      const regenerated = await this.aiEngine.regenerateReplyWithGuardFeedback({
        reviewText: review.comment || '',
        authorName: review.author.displayName,
        rating: review.starRating,
        brandVoice,
        originalDraft: proposedText,
        guardIssues: guardResult.summary,
        riskAssessment,
      });

      proposedText = regenerated.proposedText;
      model = regenerated.model;

      // Re-evaluate regenerated draft through Reply Guard
      guardResult = await this.replyGuard.validateReply({
        review,
        generatedReply: proposedText,
        businessContext: brandVoice.trustedBusinessContext,
        brandVoice,
        recentReplies,
        automationRules: rules,
        regenerationAttempts: 1,
      });
    }

    // Phase 5: Automation Rules & Publishing Decision
    const matchingRule =
      rules?.find((r) => r.starRating === review.starRating && r.isActive) ||
      DEFAULT_AUTOMATION_RULES.find((r) => r.starRating === review.starRating);

    let isEligibleForAutoPublish = false;

    // INVARIANT: Auto-publish requires:
    // 1. Reply Guard decision must be strictly AUTO_PUBLISH
    // 2. Star rating must be 4 or 5 stars
    // 3. Workflow rule must allow AUTO_PUBLISH
    // 4. Overall risk and individual risk must be LOW
    if (
      guardResult.decision === 'AUTO_PUBLISH' &&
      review.starRating >= 4 &&
      guardResult.overallRisk === 'LOW' &&
      riskAssessment.riskLevel === 'LOW' &&
      matchingRule &&
      matchingRule.action === 'AUTO_PUBLISH'
    ) {
      const currentRiskSeverity = RISK_LEVEL_SEVERITY[riskAssessment.riskLevel];
      const maxAllowedSeverity = RISK_LEVEL_SEVERITY[matchingRule.maxRiskLevelForAutoPublish];

      if (currentRiskSeverity <= maxAllowedSeverity) {
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
      guardResult,
      regenerationCount,
      publishedAt: isEligibleForAutoPublish ? new Date().toISOString() : undefined,
      publishedText: isEligibleForAutoPublish ? proposedText : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isEligibleForAutoPublish) {
      try {
        let connection = await this.googleRepo.getDecryptedTokens(review.saasCustomerId, review.businessLocationId);
        if (!connection?.accessToken) throw new Error('Google connection token unavailable; reconnect Google Business Profile');
        if (connection.tokenExpiry && new Date(connection.tokenExpiry).getTime() <= Date.now() && connection.refreshToken) {
          const refreshed = await this.googleService.refreshAccessToken(connection.refreshToken);
          const stored = await this.googleRepo.getByLocationId(review.saasCustomerId, review.businessLocationId);
          if (!stored) throw new Error('Google connection disappeared during token refresh');
          const expiry = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();
          await this.googleRepo.updateTokens(review.saasCustomerId, stored.id, refreshed.accessToken, undefined, expiry);
          connection = { ...connection, accessToken: refreshed.accessToken, tokenExpiry: expiry };
        }
        await this.googleService.publishReviewReply(connection.accessToken, review.googleReviewName, proposedText);
      } catch (err) {
        reply.status = 'FAILED_TO_PUBLISH';
        reply.publishErrorMessage = (err as Error).message;
      }
    } else {
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
        guardDecision: guardResult.decision,
        customerExplanation: guardResult.customerExplanation,
        regenerationCount,
      },
    };
  }
}
