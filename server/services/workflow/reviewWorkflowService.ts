/**
 * Review Workflow and Automation Service
 *
 * Connects all review processing components into one unified, safe workflow:
 *
 * NEW GOOGLE REVIEW
 * → persist
 * → analyze
 * → risk classification
 * → evaluate customer rules
 * → generate reply
 * → validate reply
 * → decision
 * → AUTO_PUBLISH or APPROVAL
 * → publish if approved
 * → record audit event
 * → notify customer if needed
 */

import type {
  Review,
  ReviewReply,
  RiskAssessment,
  BrandVoice,
  AutomationRule,
  AuditEvent,
  Notification,
} from '../../../shared/types/domain';
import { GeminiAiReplyEngine } from '../ai/aiReplyEngine';
import { GoogleBusinessProfileService } from '../google/googleProfileProvider';
import { NotificationService } from '../notifications/notificationService';
import { AuditService, IAuditService } from './auditService';
import { UsageGuard } from './usageGuard';
import { IdempotencyManager } from './idempotencyManager';
import { WorkflowRuleEngine } from './ruleEngine';
import { ReplyValidator } from './replyValidator';
import { PublishPublisher } from './publishPublisher';
import type {
  AutomationMode,
  LocationAutomationConfig,
  WorkflowProcessResult,
  IngestionOptions,
} from './types';

export class ReviewWorkflowService {
  private aiEngine: GeminiAiReplyEngine;
  private googleService: GoogleBusinessProfileService;
  private notificationService: NotificationService;
  private auditService: IAuditService;
  private usageGuard: UsageGuard;
  private idempotencyManager: IdempotencyManager;
  private ruleEngine: WorkflowRuleEngine;
  private replyValidator: ReplyValidator;
  private publishPublisher: PublishPublisher;

  // In-memory repositories for review workflow state
  private reviewsStore: Map<string, Review> = new Map();
  private repliesStore: Map<string, ReviewReply> = new Map();
  private automationConfigs: Map<string, LocationAutomationConfig> = new Map();

  constructor(dependencies?: {
    aiEngine?: GeminiAiReplyEngine;
    googleService?: GoogleBusinessProfileService;
    notificationService?: NotificationService;
    auditService?: IAuditService;
    usageGuard?: UsageGuard;
    idempotencyManager?: IdempotencyManager;
    ruleEngine?: WorkflowRuleEngine;
    replyValidator?: ReplyValidator;
    publishPublisher?: PublishPublisher;
  }) {
    this.aiEngine =
      dependencies?.aiEngine ||
      new GeminiAiReplyEngine(undefined, process.env.GEMINI_MODEL || 'gemini-3.8-flash');
    this.googleService = dependencies?.googleService || new GoogleBusinessProfileService();
    this.notificationService = dependencies?.notificationService || new NotificationService();
    this.auditService = dependencies?.auditService || new AuditService();
    this.usageGuard = dependencies?.usageGuard || new UsageGuard();
    this.idempotencyManager = dependencies?.idempotencyManager || new IdempotencyManager();
    this.ruleEngine = dependencies?.ruleEngine || new WorkflowRuleEngine();
    this.replyValidator = dependencies?.replyValidator || new ReplyValidator();
    this.publishPublisher =
      dependencies?.publishPublisher ||
      new PublishPublisher({
        googleService: this.googleService,
        idempotencyManager: this.idempotencyManager,
      });
  }

  // ==========================================
  // CONFIGURATION & AUTOMATION PAUSE / RESUME
  // ==========================================

  getAutomationConfig(saasCustomerId: string, locationId: string): LocationAutomationConfig {
    const key = `${saasCustomerId}:${locationId}`;
    const existing = this.automationConfigs.get(key);
    if (existing) return existing;

    const defaultConfig: LocationAutomationConfig = {
      saasCustomerId,
      businessLocationId: locationId,
      mode: 'BALANCED',
      isPaused: false,
      updatedAt: new Date().toISOString(),
    };
    this.automationConfigs.set(key, defaultConfig);
    return defaultConfig;
  }

  async pauseAutomation(params: {
    saasCustomerId: string;
    locationId: string;
    reason?: string;
    userId?: string;
  }): Promise<LocationAutomationConfig> {
    const { saasCustomerId, locationId, reason, userId } = params;
    const config = this.getAutomationConfig(saasCustomerId, locationId);

    config.isPaused = true;
    config.pausedAt = new Date().toISOString();
    config.pausedReason = reason || 'Manual pause requested by customer';
    config.pausedByUserId = userId;
    config.updatedAt = new Date().toISOString();

    const key = `${saasCustomerId}:${locationId}`;
    this.automationConfigs.set(key, config);

    // Audit: automation paused
    await this.auditService.record({
      saasCustomerId,
      action: 'automation paused',
      targetResourceType: 'LOCATION',
      targetResourceId: locationId,
      actorUserId: userId,
      details: { reason: config.pausedReason },
    });

    // Notification: automation paused
    await this.notificationService.dispatch({
      saasCustomerId,
      type: 'APPROVAL_REQUIRED',
      title: 'Autopilot Automation Paused',
      message: `Automatic review publishing has been paused for your location (${locationId}). Incoming reviews will be safely drafted and held for manual approval.`,
      channel: 'IN_APP',
      linkUrl: '/settings',
    });

    return config;
  }

  async resumeAutomation(params: {
    saasCustomerId: string;
    locationId: string;
    userId?: string;
  }): Promise<LocationAutomationConfig> {
    const { saasCustomerId, locationId, userId } = params;
    const config = this.getAutomationConfig(saasCustomerId, locationId);

    config.isPaused = false;
    config.pausedAt = undefined;
    config.pausedReason = undefined;
    config.updatedAt = new Date().toISOString();

    const key = `${saasCustomerId}:${locationId}`;
    this.automationConfigs.set(key, config);

    // Audit: automation resumed
    await this.auditService.record({
      saasCustomerId,
      action: 'automation resumed',
      targetResourceType: 'LOCATION',
      targetResourceId: locationId,
      actorUserId: userId,
    });

    return config;
  }

  async setAutomationMode(params: {
    saasCustomerId: string;
    locationId: string;
    mode: AutomationMode;
    userId?: string;
  }): Promise<LocationAutomationConfig> {
    const { saasCustomerId, locationId, mode, userId } = params;
    const config = this.getAutomationConfig(saasCustomerId, locationId);

    config.mode = mode;
    config.updatedAt = new Date().toISOString();

    const key = `${saasCustomerId}:${locationId}`;
    this.automationConfigs.set(key, config);

    return config;
  }

  // ==========================================
  // CORE WORKFLOW PIPELINE
  // ==========================================

  /**
   * Ingest and process a review through the entire safety and automation lifecycle.
   */
  async processReview(params: {
    review: Review;
    brandVoice: BrandVoice;
    customRules?: AutomationRule[];
    options?: IngestionOptions;
  }): Promise<WorkflowProcessResult> {
    const { review, brandVoice, customRules, options } = params;
    const saasCustomerId = review.saasCustomerId;
    const locationId = review.businessLocationId;
    const recordedAudits: AuditEvent[] = [];
    const dispatchedNotifs: Notification[] = [];

    // STEP 1: Persist review & record audit
    // Check if review was already saved
    let existingReview = this.reviewsStore.get(review.id);
    if (!existingReview) {
      existingReview = { ...review };
      this.reviewsStore.set(review.id, existingReview);

      const auditReceived = await this.auditService.record({
        saasCustomerId,
        action: 'review received',
        targetResourceType: 'REVIEW',
        targetResourceId: review.id,
        actorUserId: options?.actorUserId,
        actorType: 'GOOGLE_WEBHOOK',
        details: {
          starRating: review.starRating,
          authorName: review.author.displayName,
          googleReviewName: review.googleReviewName,
        },
      });
      recordedAudits.push(auditReceived);
    }

    // STEP 2: Analyze & Risk classification
    const riskAssessment = await this.aiEngine.assessRisk(
      review.comment || '',
      review.starRating
    );
    existingReview.riskAssessment = riskAssessment;

    const auditAnalyzed = await this.auditService.record({
      saasCustomerId,
      action: 'AI analyzed',
      targetResourceType: 'REVIEW',
      targetResourceId: review.id,
      details: {
        riskLevel: riskAssessment.riskLevel,
        flags: riskAssessment.flags,
        confidenceScore: riskAssessment.confidenceScore,
      },
    });
    recordedAudits.push(auditAnalyzed);

    // Notification: High-risk review detected
    if (riskAssessment.riskLevel === 'HIGH' || riskAssessment.riskLevel === 'CRITICAL') {
      const highRiskNotif = await this.notificationService.dispatch({
        saasCustomerId,
        type: 'CRITICAL_RISK_DETECTED',
        title: `High Risk Detected: ${review.starRating}★ Review from ${review.author.displayName}`,
        message: `A review was flagged for ${riskAssessment.flags.join(', ') || riskAssessment.riskLevel}. Auto-publishing is locked; human review required.`,
        channel: 'IN_APP',
        linkUrl: `/reviews?reviewId=${review.id}`,
      });
      dispatchedNotifs.push(highRiskNotif);
    }

    // STEP 3: Evaluate Customer Rules & Automation Mode
    const locationConfig = this.getAutomationConfig(saasCustomerId, locationId);
    const ruleEvaluation = this.ruleEngine.evaluateDecision({
      starRating: review.starRating,
      riskAssessment,
      automationMode: locationConfig.mode,
      isPaused: locationConfig.isPaused,
      customRules,
    });

    // STEP 4: Generate Reply Draft (with Cost Control Usage Guard)
    let proposedText = '';
    let aiModel = 'gemini-2.5-flash';

    // Check if reply draft already exists and we are not forcing re-generation
    const existingReply = review.replyId ? this.repliesStore.get(review.replyId) : undefined;

    if (existingReply && !options?.forceRegenerate) {
      proposedText = existingReply.proposedText;
      aiModel = existingReply.aiModel || 'gemini-2.5-flash';
    } else {
      // Apply Cost Control usage check
      const usageCheck = this.usageGuard.checkAndConsume(saasCustomerId);
      if (!usageCheck.allowed) {
        // Fallback to deterministic safe response when throttled
        proposedText = this.buildThrottledSafeDraft(
          review.author.displayName,
          review.starRating,
          brandVoice.trustedBusinessContext?.contactEmailForInquiries || 'our team'
        );
        aiModel = 'safe-fallback-cost-control';
      } else {
        const aiDraft = await this.aiEngine.generateReplyDraft({
          reviewText: review.comment || '',
          authorName: review.author.displayName,
          rating: review.starRating,
          brandVoice,
          riskAssessment,
        });
        proposedText = aiDraft.proposedText;
        aiModel = aiDraft.model;
      }

      const auditDraft = await this.auditService.record({
        saasCustomerId,
        action: 'draft generated',
        targetResourceType: 'REPLY',
        targetResourceId: review.id,
        details: { model: aiModel },
      });
      recordedAudits.push(auditDraft);
    }

    // STEP 5: Validate Reply
    const validation = this.replyValidator.validate(proposedText);
    let finalDecision = ruleEvaluation.decision;

    // If reply violates safety boundaries, force APPROVAL
    if (!validation.isValid) {
      finalDecision = 'REQUIRE_APPROVAL';
    }

    // If skipped auto-publish via options
    if (options?.skipAutoPublish) {
      finalDecision = 'REQUIRE_APPROVAL';
    }

    // STEP 6: Decision & Reply Creation
    const isAutoPublish = finalDecision === 'AUTO_PUBLISH';
    const replyId = review.replyId || `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const reply: ReviewReply = {
      id: replyId,
      reviewId: review.id,
      saasCustomerId,
      businessLocationId: locationId,
      proposedText,
      status: isAutoPublish ? 'AUTO_PUBLISHED' : 'PENDING_APPROVAL',
      generatedByAi: true,
      aiModel,
      createdAt: existingReply?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    existingReview.replyId = replyId;
    this.repliesStore.set(replyId, reply);

    // STEP 7: Publishing or Approval Branch
    let published = false;
    let publishResult;

    if (isAutoPublish) {
      const auditAutoApproved = await this.auditService.record({
        saasCustomerId,
        action: 'auto-approved',
        targetResourceType: 'REPLY',
        targetResourceId: reply.id,
        details: { mode: locationConfig.mode, starRating: review.starRating },
      });
      recordedAudits.push(auditAutoApproved);

      // STEP 8: Dispatch to Google Business Profile with Idempotency & Retries
      publishResult = await this.publishPublisher.publishReply({
        reviewId: review.id,
        googleReviewName: review.googleReviewName,
        replyText: proposedText,
      });

      if (publishResult.success) {
        published = true;
        reply.status = 'AUTO_PUBLISHED';
        reply.publishedText = proposedText;
        reply.publishedAt = publishResult.publishedAt || new Date().toISOString();

        const auditPublished = await this.auditService.record({
          saasCustomerId,
          action: 'published',
          targetResourceType: 'REPLY',
          targetResourceId: reply.id,
          details: { mechanism: 'AUTO_PUBLISH', replyName: publishResult.replyName },
        });
        recordedAudits.push(auditPublished);
      } else {
        // Publish failed
        reply.status = 'FAILED_TO_PUBLISH';
        reply.publishErrorMessage = publishResult.error;

        const auditFailed = await this.auditService.record({
          saasCustomerId,
          action: 'publish failed',
          targetResourceType: 'REPLY',
          targetResourceId: reply.id,
          details: {
            error: publishResult.error,
            isPermanentAuthFailure: publishResult.isPermanentAuthFailure,
          },
        });
        recordedAudits.push(auditFailed);

        // Notification: Publish failure
        const notifFail = await this.notificationService.dispatch({
          saasCustomerId,
          type: 'PUBLISH_FAILED',
          title: `Reply Publish Failed for ${review.author.displayName}`,
          message: `Google API rejected response dispatch: ${publishResult.error}`,
          channel: 'IN_APP',
          linkUrl: `/reviews?reviewId=${review.id}`,
        });
        dispatchedNotifs.push(notifFail);

        // Notification: Google connection failure if permanent auth error
        if (publishResult.isPermanentAuthFailure) {
          const notifConn = await this.notificationService.dispatch({
            saasCustomerId,
            type: 'TOKEN_EXPIRING',
            title: 'Google Business Profile Authorization Error',
            message: 'Your Google Business Profile connection requires re-authentication. Autopilot publishing is paused until reconnected.',
            channel: 'IN_APP',
            linkUrl: '/settings',
          });
          dispatchedNotifs.push(notifConn);
        }
      }
    } else {
      // REQUIRE_APPROVAL
      reply.status = 'PENDING_APPROVAL';

      const auditApprovalReq = await this.auditService.record({
        saasCustomerId,
        action: 'approval requested',
        targetResourceType: 'REPLY',
        targetResourceId: reply.id,
        details: { reason: ruleEvaluation.reason },
      });
      recordedAudits.push(auditApprovalReq);

      // Notification: approval required
      const notifApproval = await this.notificationService.dispatch({
        saasCustomerId,
        type: 'APPROVAL_REQUIRED',
        title: `Approval Required: ${review.starRating}★ Review from ${review.author.displayName}`,
        message: `A new ${review.starRating}-star review requires your review and approval before publishing.`,
        channel: 'IN_APP',
        linkUrl: `/reviews?reviewId=${review.id}`,
      });
      dispatchedNotifs.push(notifApproval);
    }

    reply.updatedAt = new Date().toISOString();
    existingReview.updatedAt = new Date().toISOString();

    return {
      review: existingReview,
      reply,
      decision: finalDecision,
      riskAssessment,
      isSensitive: ruleEvaluation.isSensitive,
      published,
      publishResult,
      auditEventsRecorded: recordedAudits,
      notificationsDispatched: dispatchedNotifs,
    };
  }

  // ==========================================
  // MANUAL ACTIONS (APPROVE, REJECT, REGENERATE)
  // ==========================================

  /**
   * Customer manually approves a staged review reply.
   */
  async approveReviewReply(params: {
    reviewId: string;
    editedReplyText?: string;
    userId?: string;
  }): Promise<{ review: Review; reply: ReviewReply; success: boolean; error?: string }> {
    const { reviewId, editedReplyText, userId } = params;
    const review = this.reviewsStore.get(reviewId);

    if (!review) {
      throw new Error(`Review with ID ${reviewId} not found.`);
    }

    const reply = review.replyId ? this.repliesStore.get(review.replyId) : undefined;
    if (!reply) {
      throw new Error(`Reply draft not found for review ${reviewId}.`);
    }

    // IDEMPOTENCY CHECK: Never publish twice!
    if (this.idempotencyManager.isAlreadyPublished(reviewId, review.googleReviewName)) {
      return { review, reply, success: true };
    }

    const textToPublish = editedReplyText || reply.proposedText;

    // Validate edited text
    const validation = this.replyValidator.validate(textToPublish);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.violations.join(', ')}`);
    }

    // Audit: approved
    await this.auditService.record({
      saasCustomerId: review.saasCustomerId,
      action: 'approved',
      targetResourceType: 'REPLY',
      targetResourceId: reply.id,
      actorUserId: userId,
      actorType: 'USER',
      details: { wasEdited: Boolean(editedReplyText) },
    });

    // Dispatch to Google
    const publishResult = await this.publishPublisher.publishReply({
      reviewId: review.id,
      googleReviewName: review.googleReviewName,
      replyText: textToPublish,
    });

    if (publishResult.success) {
      reply.status = 'MANUALLY_PUBLISHED';
      reply.publishedText = textToPublish;
      reply.publishedAt = publishResult.publishedAt || new Date().toISOString();
      reply.reviewedByUserId = userId;
      reply.reviewedAt = new Date().toISOString();
      reply.updatedAt = new Date().toISOString();

      // Audit: published
      await this.auditService.record({
        saasCustomerId: review.saasCustomerId,
        action: 'published',
        targetResourceType: 'REPLY',
        targetResourceId: reply.id,
        actorUserId: userId,
        actorType: 'USER',
        details: { mechanism: 'MANUALLY_PUBLISHED', replyName: publishResult.replyName },
      });

      return { review, reply, success: true };
    } else {
      reply.status = 'FAILED_TO_PUBLISH';
      reply.publishErrorMessage = publishResult.error;
      reply.updatedAt = new Date().toISOString();

      // Audit: publish failed
      await this.auditService.record({
        saasCustomerId: review.saasCustomerId,
        action: 'publish failed',
        targetResourceType: 'REPLY',
        targetResourceId: reply.id,
        actorUserId: userId,
        details: { error: publishResult.error },
      });

      // Notification: publish failure
      await this.notificationService.dispatch({
        saasCustomerId: review.saasCustomerId,
        type: 'PUBLISH_FAILED',
        title: `Manual Publish Failed for ${review.author.displayName}`,
        message: `Google API rejected reply: ${publishResult.error}`,
        channel: 'IN_APP',
        linkUrl: `/reviews?reviewId=${review.id}`,
      });

      // Notification: Google connection failure if permanent auth failure
      if (publishResult.isPermanentAuthFailure) {
        await this.notificationService.dispatch({
          saasCustomerId: review.saasCustomerId,
          type: 'TOKEN_EXPIRING',
          title: 'Google Business Profile Authorization Error',
          message: 'Your Google Business Profile connection requires re-authentication.',
          channel: 'IN_APP',
          linkUrl: '/settings',
        });
      }

      return { review, reply, success: false, error: publishResult.error };
    }
  }

  /**
   * Customer rejects a reply draft (no reply will be sent).
   */
  async rejectReviewReply(params: {
    reviewId: string;
    reason?: string;
    userId?: string;
  }): Promise<{ review: Review; reply: ReviewReply }> {
    const { reviewId, reason, userId } = params;
    const review = this.reviewsStore.get(reviewId);

    if (!review) {
      throw new Error(`Review with ID ${reviewId} not found.`);
    }

    const reply = review.replyId ? this.repliesStore.get(review.replyId) : undefined;
    if (!reply) {
      throw new Error(`Reply draft not found for review ${reviewId}.`);
    }

    reply.status = 'REJECTED';
    reply.reviewedByUserId = userId;
    reply.reviewedAt = new Date().toISOString();
    reply.updatedAt = new Date().toISOString();

    // Audit: rejected
    await this.auditService.record({
      saasCustomerId: review.saasCustomerId,
      action: 'rejected',
      targetResourceType: 'REPLY',
      targetResourceId: reply.id,
      actorUserId: userId,
      actorType: 'USER',
      details: { reason },
    });

    return { review, reply };
  }

  /**
   * Regenerate draft for a review.
   */
  async regenerateReplyDraft(params: {
    reviewId: string;
    brandVoice: BrandVoice;
    userId?: string;
  }): Promise<{ review: Review; reply: ReviewReply }> {
    const { reviewId, brandVoice, userId } = params;
    const review = this.reviewsStore.get(reviewId);

    if (!review) {
      throw new Error(`Review with ID ${reviewId} not found.`);
    }

    // Check usage guard
    const usageCheck = this.usageGuard.checkAndConsume(review.saasCustomerId);
    let proposedText = '';
    let aiModel = 'gemini-2.5-flash';

    if (!usageCheck.allowed) {
      proposedText = this.buildThrottledSafeDraft(
        review.author.displayName,
        review.starRating,
        brandVoice.trustedBusinessContext?.contactEmailForInquiries || 'our team'
      );
      aiModel = 'safe-fallback-cost-control';
    } else {
      const riskAssessment =
        review.riskAssessment ||
        (await this.aiEngine.assessRisk(review.comment || '', review.starRating));
      review.riskAssessment = riskAssessment;

      const draft = await this.aiEngine.generateReplyDraft({
        reviewText: review.comment || '',
        authorName: review.author.displayName,
        rating: review.starRating,
        brandVoice,
        riskAssessment,
      });
      proposedText = draft.proposedText;
      aiModel = draft.model;
    }

    let reply = review.replyId ? this.repliesStore.get(review.replyId) : undefined;
    if (!reply) {
      reply = {
        id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        reviewId: review.id,
        saasCustomerId: review.saasCustomerId,
        businessLocationId: review.businessLocationId,
        proposedText,
        status: 'PENDING_APPROVAL',
        generatedByAi: true,
        aiModel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      review.replyId = reply.id;
      this.repliesStore.set(reply.id, reply);
    } else {
      reply.proposedText = proposedText;
      reply.aiModel = aiModel;
      reply.status = 'PENDING_APPROVAL';
      reply.updatedAt = new Date().toISOString();
    }

    // Audit: draft generated
    await this.auditService.record({
      saasCustomerId: review.saasCustomerId,
      action: 'draft generated',
      targetResourceType: 'REPLY',
      targetResourceId: reply.id,
      actorUserId: userId,
      actorType: 'USER',
      details: { trigger: 'manual_regeneration', model: aiModel },
    });

    return { review, reply };
  }

  // ==========================================
  // QUERY METHODS
  // ==========================================

  getReview(id: string): (Review & { reply?: ReviewReply }) | undefined {
    const rev = this.reviewsStore.get(id);
    if (!rev) return undefined;
    const rep = rev.replyId ? this.repliesStore.get(rev.replyId) : undefined;
    return { ...rev, reply: rep };
  }

  listReviews(saasCustomerId: string): (Review & { reply?: ReviewReply })[] {
    return Array.from(this.reviewsStore.values())
      .filter((r) => r.saasCustomerId === saasCustomerId)
      .map((r) => ({
        ...r,
        reply: r.replyId ? this.repliesStore.get(r.replyId) : undefined,
      }));
  }

  seedReviews(reviews: Review[], replies?: ReviewReply[]): void {
    for (const r of reviews) {
      this.reviewsStore.set(r.id, r);
    }
    if (replies) {
      for (const rep of replies) {
        this.repliesStore.set(rep.id, rep);
      }
    }
  }

  getAuditService(): IAuditService {
    return this.auditService;
  }

  getUsageGuard(): UsageGuard {
    return this.usageGuard;
  }

  getIdempotencyManager(): IdempotencyManager {
    return this.idempotencyManager;
  }

  getNotificationService(): NotificationService {
    return this.notificationService;
  }

  private buildThrottledSafeDraft(
    authorName: string,
    rating: number,
    contactInfo: string
  ): string {
    const greeting = authorName ? `Hi ${authorName},` : 'Hello,';
    if (rating >= 4) {
      return `${greeting} thank you so much for your review and support! We look forward to seeing you again.`;
    }
    return `${greeting} thank you for your feedback. We take all guest experiences seriously. Please feel free to reach out to ${contactInfo} so we can assist directly.`;
  }
}
