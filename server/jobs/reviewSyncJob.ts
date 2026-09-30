/**
 * Google Business Profile Review Synchronization Job
 *
 * Implements:
 * 1. Multi-page pagination traversal across Google reviews.
 * 2. Guaranteed review deduplication: synchronizing twice never duplicates reviews.
 * 3. Strict workflow engine gatekeeper:
 *    - Never publishes a reply unless the workflow engine explicitly approves AUTO_PUBLISH.
 *    - If review is APPROVAL_REQUIRED: stages draft only (PENDING_APPROVAL), never publishes to Google.
 * 4. Support for scheduled polling and on-demand "Sync now".
 */

import type {
  Review,
  ReviewReply,
  AutomationRule,
  BrandVoice,
  StarRating,
} from '../../shared/types/domain';
import type { SyncResult, GoogleReviewDto } from '../services/google/types';
import { DEFAULT_AUTOMATION_RULES, RISK_LEVEL_SEVERITY } from '../../shared/constants/automation';
import { GeminiAiReplyEngine } from '../services/ai/aiReplyEngine';
import { GoogleBusinessProfileService } from '../services/google/googleProfileProvider';
import { NotificationService } from '../services/notifications/notificationService';

export interface IngestionResult {
  reviewId: string;
  actionTaken: 'AUTO_PUBLISHED' | 'STAGED_FOR_APPROVAL' | 'SKIPPED_DUPLICATE';
  riskLevel: string;
}

export class ReviewSyncJob {
  private aiEngine: GeminiAiReplyEngine;
  private googleService: GoogleBusinessProfileService;
  private notificationService: NotificationService;

  // In-memory repository of reviews keyed by `businessLocationId:googleReviewId`
  private reviewStore = new Map<string, Review & { reply?: ReviewReply }>();
  private pollingIntervalId: NodeJS.Timeout | null = null;

  constructor(
    googleService?: GoogleBusinessProfileService,
    aiEngine?: GeminiAiReplyEngine,
    notificationService?: NotificationService
  ) {
    this.googleService = googleService || new GoogleBusinessProfileService();
    this.aiEngine =
      aiEngine || new GeminiAiReplyEngine(undefined, process.env.GEMINI_MODEL || 'gemini-3.8-flash');
    this.notificationService = notificationService || new NotificationService();

    this.seedInitialReviews();
  }

  private seedInitialReviews(): void {
    // Initial demo review seeds
    const rev1: Review & { reply?: ReviewReply } = {
      id: 'rev_001',
      saasCustomerId: 'saas_cust_demo_01',
      businessLocationId: 'loc_001',
      googleReviewId: 'google_rev_101',
      googleReviewName: 'accounts/101/locations/loc_001/reviews/google_rev_101',
      author: { displayName: 'Emily Rodriguez', isAnonymous: false },
      starRating: 5,
      comment: 'Dr. Sarah and the hygienists are the best in SF! Extremely gentle cleaning and spotless clinic.',
      reviewCreatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      riskAssessment: {
        riskLevel: 'LOW',
        flags: [],
        explanation: 'Positive feedback without legal or safety concerns.',
        confidenceScore: 0.98,
        recommendedAction: 'AUTO_PUBLISH',
      },
      replyId: 'reply_001',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      reply: {
        id: 'reply_001',
        reviewId: 'rev_001',
        saasCustomerId: 'saas_cust_demo_01',
        businessLocationId: 'loc_001',
        proposedText: 'Hi Emily, thank you so much for the 5-star review! Dr. Sarah and the whole team are thrilled to hear your cleaning went so smoothly. See you at your next visit!',
        publishedText: 'Hi Emily, thank you so much for the 5-star review! Dr. Sarah and the whole team are thrilled to hear your cleaning went so smoothly. See you at your next visit!',
        status: 'AUTO_PUBLISHED',
        generatedByAi: true,
        aiModel: 'gemini-2.5-flash',
        publishedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
      },
    };
    this.reviewStore.set(`${rev1.businessLocationId}:${rev1.googleReviewId}`, rev1);
  }

  public getReviewsForLocation(businessLocationId: string): (Review & { reply?: ReviewReply })[] {
    const list: (Review & { reply?: ReviewReply })[] = [];
    for (const rev of this.reviewStore.values()) {
      if (rev.businessLocationId === businessLocationId) {
        list.push(rev);
      }
    }
    return list;
  }

  public getAllReviews(saasCustomerId: string): (Review & { reply?: ReviewReply })[] {
    const list: (Review & { reply?: ReviewReply })[] = [];
    for (const rev of this.reviewStore.values()) {
      if (rev.saasCustomerId === saasCustomerId) {
        list.push(rev);
      }
    }
    return list;
  }

  public getReviewById(reviewId: string): (Review & { reply?: ReviewReply }) | undefined {
    for (const rev of this.reviewStore.values()) {
      if (rev.id === reviewId) return rev;
    }
    return undefined;
  }

  public updateReviewReply(reviewId: string, reply: ReviewReply): void {
    for (const rev of this.reviewStore.values()) {
      if (rev.id === reviewId) {
        rev.reply = reply;
        rev.replyId = reply.id;
        rev.updatedAt = new Date().toISOString();
        break;
      }
    }
  }

  /**
   * "Sync now" / scheduled sync for a business location.
   * Traverses all paginated reviews from Google Business Profile,
   * performs strict deduplication, and processes newly discovered reviews.
   */
  async syncLocationReviews(params: {
    saasCustomerId: string;
    businessLocationId: string;
    googleLocationName: string;
    brandVoice: BrandVoice;
    rules?: AutomationRule[];
  }): Promise<SyncResult> {
    const { saasCustomerId, businessLocationId, googleLocationName, brandVoice, rules } = params;

    let nextPageToken: string | undefined = undefined;
    let totalFetched = 0;
    let newReviewsCount = 0;
    let updatedReviewsCount = 0;
    let duplicateReviewsSkipped = 0;
    let autoPublishedCount = 0;
    let stagedForApprovalCount = 0;
    const errors: string[] = [];

    do {
      try {
        const pageResult = await this.googleService.listReviews(
          saasCustomerId,
          googleLocationName,
          nextPageToken,
          10
        );

        nextPageToken = pageResult.nextPageToken;
        const fetchedList = pageResult.reviews || [];
        totalFetched += fetchedList.length;

        for (const rawGoogleReview of fetchedList) {
          const dedupeKey = `${businessLocationId}:${rawGoogleReview.reviewId}`;
          const existingReview = this.reviewStore.get(dedupeKey);

          if (existingReview) {
            // Check if comment or rating has changed
            const isCommentChanged = existingReview.comment !== (rawGoogleReview.comment || '');
            const isRatingChanged = existingReview.starRating !== rawGoogleReview.starRating;

            if (!isCommentChanged && !isRatingChanged) {
              // Exact duplicate already processed: skip
              duplicateReviewsSkipped++;
              continue;
            }

            // Update existing review without duplicating
            existingReview.comment = rawGoogleReview.comment || '';
            existingReview.starRating = rawGoogleReview.starRating;
            existingReview.reviewUpdatedAt = rawGoogleReview.updateTime || new Date().toISOString();
            existingReview.updatedAt = new Date().toISOString();
            updatedReviewsCount++;
            continue;
          }

          // New review discovered: convert to domain Review entity
          const newReview: Review = {
            id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            saasCustomerId,
            businessLocationId,
            googleReviewId: rawGoogleReview.reviewId,
            googleReviewName: rawGoogleReview.name,
            author: {
              displayName: rawGoogleReview.reviewer.displayName || 'Valued Customer',
              profilePhotoUrl: rawGoogleReview.reviewer.profilePhotoUrl,
              isAnonymous: rawGoogleReview.reviewer.isAnonymous,
            },
            starRating: rawGoogleReview.starRating,
            comment: rawGoogleReview.comment || '',
            reviewCreatedAt: rawGoogleReview.createTime || new Date().toISOString(),
            reviewUpdatedAt: rawGoogleReview.updateTime,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          newReviewsCount++;

          // Process through the safety & automation workflow
          const { reply, result } = await this.processIngestedReview({
            review: newReview,
            brandVoice,
            rules,
          });

          newReview.replyId = reply.id;
          if (result.actionTaken === 'AUTO_PUBLISHED') {
            autoPublishedCount++;
          } else {
            stagedForApprovalCount++;
          }

          // Store in unified deduplication map
          this.reviewStore.set(dedupeKey, {
            ...newReview,
            reply,
          });
        }
      } catch (err) {
        errors.push((err as Error).message);
        break; // Stop pagination on error
      }
    } while (nextPageToken);

    return {
      locationId: businessLocationId,
      totalFetched,
      newReviewsCount,
      updatedReviewsCount,
      duplicateReviewsSkipped,
      autoPublishedCount,
      stagedForApprovalCount,
      errors,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Process a single review through safety classification and automation rules.
   * STRICT CONTRACT:
   * - Never publish unless workflow engine has explicitly approved AUTO_PUBLISH.
   * - If APPROVAL_REQUIRED: return draft only (PENDING_APPROVAL).
   */
  async processIngestedReview(params: {
    review: Review;
    brandVoice: BrandVoice;
    rules?: AutomationRule[];
  }): Promise<{ reply: ReviewReply; result: IngestionResult }> {
    const { review, brandVoice, rules } = params;

    // Phase 1: AI Safety & Risk Assessment
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
    const matchingRule =
      rules?.find((r) => r.starRating === review.starRating && r.isActive) ||
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

    const replyId = `reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const reply: ReviewReply = {
      id: replyId,
      reviewId: review.id,
      saasCustomerId: review.saasCustomerId,
      businessLocationId: review.businessLocationId,
      proposedText,
      // If NOT eligible: strictly set to PENDING_APPROVAL (draft only)
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
        await this.googleService.publishReply(
          review.saasCustomerId,
          review.googleReviewName,
          proposedText
        );
      } catch (err) {
        reply.status = 'FAILED_TO_PUBLISH';
        reply.publishErrorMessage = (err as Error).message;
      }
    } else {
      // APPROVAL_REQUIRED: Draft only, never published to Google!
      // Dispatch notification to business owner
      if (riskAssessment.riskLevel === 'CRITICAL' || riskAssessment.riskLevel === 'HIGH') {
        await this.notificationService.dispatch({
          saasCustomerId: review.saasCustomerId,
          type: 'CRITICAL_RISK_DETECTED',
          title: `Critical Risk Detected: ${review.starRating}★ Review from ${review.author.displayName}`,
          message: riskAssessment.explanation,
          channel: 'IN_APP',
          linkUrl: `/reviews?reviewId=${review.id}`,
        });
      } else {
        await this.notificationService.notifyApprovalRequired(
          review.saasCustomerId,
          review.author.displayName,
          review.starRating,
          review.id
        );
      }
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

  /**
   * Starts periodic polling for reviews.
   */
  startPolling(
    intervalMs = 300000,
    pollHandler?: () => Promise<void>
  ): void {
    if (this.pollingIntervalId) return;

    this.pollingIntervalId = setInterval(async () => {
      try {
        if (pollHandler) {
          await pollHandler();
        }
      } catch (err) {
        console.error('[ReviewSyncJob] Polling error:', err);
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }
}

export const reviewSyncJob = new ReviewSyncJob();
