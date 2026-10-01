import crypto from 'crypto';
import { Router } from 'express';
import { requireAuth, requireTenant, requireTenantOwnership, type AuthenticatedRequest } from '../middleware/auth.ts';
import { GoogleBusinessProfileService } from '../services/google/googleProfileProvider.ts';
import { GeminiAiReplyEngine } from '../services/ai/aiReplyEngine';
import { ReplyGuardService } from '../services/workflow/replyGuardService';
import {
  ReviewRepository,
  ReplyRepository,
  BrandVoiceRepository,
  AutomationRuleRepository,
  AuditRepository,
  IdempotencyRepository,
  GoogleConnectionRepository,
} from '../repositories/postgresRepositories.ts';

const router = Router();
const googleService = new GoogleBusinessProfileService();
const aiEngine = new GeminiAiReplyEngine();
const replyGuard = new ReplyGuardService();

const reviewRepo = new ReviewRepository();
const replyRepo = new ReplyRepository();
const brandVoiceRepo = new BrandVoiceRepository();
const ruleRepo = new AutomationRuleRepository();
const auditRepo = new AuditRepository();
const idempotencyRepo = new IdempotencyRepository();
const googleRepo = new GoogleConnectionRepository();

router.use(requireAuth);
router.use(requireTenant);

// GET /api/reviews
router.get('/', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const locationId = req.query.locationId as string | undefined;

  const reviewsList = await reviewRepo.listByTenant(tenantId, locationId);
  const reviewsWithReplies = await Promise.all(
    reviewsList.map(async (rev) => {
      const reply = rev.replyId ? await replyRepo.getById(tenantId, rev.replyId) : null;
      return {
        ...rev,
        reply: reply || undefined,
      };
    })
  );

  res.json({ success: true, data: reviewsWithReplies });
});

// GET /api/reviews/:id
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const review = await reviewRepo.getById(tenantId, req.params.id);

  if (!review) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found' } });
    return;
  }

  if (!requireTenantOwnership(review.saasCustomerId, req, res)) return;

  const reply = review.replyId ? await replyRepo.getById(tenantId, review.replyId) : null;
  res.json({ success: true, data: { ...review, reply: reply || undefined } });
});

// POST /api/reviews/:id/approve
router.post('/:id/approve', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const review = await reviewRepo.getById(tenantId, req.params.id);

  if (!review) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found' } });
    return;
  }

  if (!requireTenantOwnership(review.saasCustomerId, req, res)) return;

  const reply = review.replyId ? await replyRepo.getById(tenantId, review.replyId) : null;
  if (!reply) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reply draft not found' } });
    return;
  }

  // Idempotency: Do not publish the same reply twice
  if (reply.status === 'AUTO_PUBLISHED' || reply.status === 'MANUALLY_PUBLISHED') {
    res.json({
      success: true,
      data: { review, reply, message: 'Reply was already published to Google.' },
    });
    return;
  }

  const { editedReplyText } = req.body || {};
  const textToPublish = editedReplyText || reply.proposedText;

  if (typeof textToPublish !== 'string' || !textToPublish.trim()) {
    res.status(400).json({ success: false, error: { code: 'EMPTY_REPLY', message: 'Reply text must not be empty.' } });
    return;
  }
  if (reply.guardResult?.decision === 'BLOCK' || reply.guardResult?.decision === 'BLOCK_AND_REGENERATE') {
    res.status(409).json({ success: false, error: { code: 'REPLY_BLOCKED_BY_GUARD', message: 'This reply was blocked by the safety checks and cannot be published.' } });
    return;
  }

  const connection = await googleRepo.getByLocationId(tenantId, review.businessLocationId);
  const tokens = await googleRepo.getDecryptedTokens(tenantId, review.businessLocationId);
  if (!connection || connection.status !== 'CONNECTED' || !tokens) {
    res.status(409).json({ success: false, error: { code: 'GOOGLE_NOT_CONNECTED', message: 'Reconnect Google Business Profile before publishing this reply.' } });
    return;
  }

  let accessToken = tokens.accessToken;
  if (!tokens.tokenExpiry || new Date(tokens.tokenExpiry).getTime() <= Date.now() + 60_000) {
    if (!tokens.refreshToken) {
      res.status(409).json({ success: false, error: { code: 'GOOGLE_REAUTH_REQUIRED', message: 'Google authorization expired. Reconnect your Google Business Profile.' } });
      return;
    }
    const refreshed = await googleService.refreshAccessToken(tokens.refreshToken);
    accessToken = refreshed.accessToken;
    await googleRepo.updateTokens(tenantId, connection.id, accessToken, undefined, new Date(Date.now() + refreshed.expiresIn * 1000).toISOString());
  }

  // Only mark the reply published after Google confirms the write succeeded.
  await googleService.publishReviewReply(accessToken, review.googleReviewName, textToPublish);

  const updatedReply = await replyRepo.update(tenantId, reply.id, {
    status: 'MANUALLY_PUBLISHED',
    publishedText: textToPublish,
    publishedAt: new Date().toISOString(),
    reviewedByUserId: req.auth!.userId,
    reviewedAt: new Date().toISOString(),
  });

  await auditRepo.logEvent({
    id: `audit_${crypto.randomUUID()}`,
    saasCustomerId: tenantId,
    actorUserId: req.auth!.userId,
    actorType: 'USER',
    action: 'MANUALLY_PUBLISHED_REPLY',
    targetResourceType: 'REPLY',
    targetResourceId: reply.id,
    details: {
      reviewId: review.id,
      wasEdited: Boolean(editedReplyText),
    },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: { review, reply: updatedReply } });
});

// POST /api/reviews/:id/regenerate
router.post('/:id/regenerate', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const review = await reviewRepo.getById(tenantId, req.params.id);

  if (!review) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found' } });
    return;
  }

  if (!requireTenantOwnership(review.saasCustomerId, req, res)) return;

  const brandVoice = (await brandVoiceRepo.getByTenant(tenantId)) || {
    id: `bv_${tenantId}`,
    saasCustomerId: tenantId,
    tone: 'WARM_AND_PROFESSIONAL' as const,
    trustedBusinessContext: {
      ownerOrManagerTitle: 'General Manager',
      contactEmailForInquiries: 'support@business.com',
      coreServicesOffered: ['Service'],
      prohibitedTopics: ['No prices', 'No liability admission'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rules = await ruleRepo.listByTenant(tenantId);
  const recentReplies = await replyRepo.listRecentByLocation(tenantId, review.businessLocationId, 5);

  const riskAssessment =
    review.riskAssessment ||
    (await aiEngine.assessRisk(review.comment || '', review.starRating));
  review.riskAssessment = riskAssessment;

  const { proposedText, model } = await aiEngine.generateReplyDraft({
    reviewText: review.comment || '',
    authorName: review.author.displayName,
    rating: review.starRating,
    brandVoice,
    riskAssessment,
  });

  const guardResult = await replyGuard.validateReply({
    review,
    generatedReply: proposedText,
    businessContext: brandVoice.trustedBusinessContext,
    brandVoice,
    recentReplies: recentReplies.map((r) => ({
      proposedText: r.proposedText,
      publishedText: r.publishedText,
    })),
    automationRules: rules,
    regenerationAttempts: 1,
  });

  let reply = review.replyId ? await replyRepo.getById(tenantId, review.replyId) : null;
  if (!reply) {
    reply = await replyRepo.create(tenantId, {
      id: `reply_${Date.now()}`,
      reviewId: review.id,
      saasCustomerId: tenantId,
      businessLocationId: review.businessLocationId,
      proposedText,
      status: 'PENDING_APPROVAL',
      generatedByAi: true,
      aiModel: model,
      guardResult,
      regenerationCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await reviewRepo.update(tenantId, review.id, { replyId: reply.id });
  } else {
    reply = await replyRepo.update(tenantId, reply.id, {
      proposedText,
      aiModel: model,
      guardResult,
      regenerationCount: (reply.regenerationCount || 0) + 1,
      status: 'PENDING_APPROVAL',
    });
  }

  await auditRepo.logEvent({
    id: `audit_${Date.now()}`,
    saasCustomerId: tenantId,
    actorUserId: req.auth!.userId,
    actorType: 'USER',
    action: 'REPLY_REGENERATED',
    targetResourceType: 'REVIEW',
    targetResourceId: review.id,
    details: {
      guardDecision: guardResult.decision,
      overallRisk: guardResult.overallRisk,
    },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: { review, reply } });
});

export default router;
