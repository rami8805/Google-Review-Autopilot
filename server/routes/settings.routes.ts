import { Router } from 'express';
import { requireAuth, requireTenant, type AuthenticatedRequest } from '../middleware/auth.ts';
import {
  AutomationRuleRepository,
  BrandVoiceRepository,
  AuditRepository,
} from '../repositories/postgresRepositories.ts';
import type { AutomationRule, BrandVoice } from '../../shared/types/domain.ts';

const router = Router();
const ruleRepo = new AutomationRuleRepository();
const brandVoiceRepo = new BrandVoiceRepository();
const auditRepo = new AuditRepository();

router.use(requireAuth);
router.use(requireTenant);

// GET /api/settings/automation-rules
router.get('/automation-rules', async (req: AuthenticatedRequest, res) => {
  const rules = await ruleRepo.listByTenant(req.auth!.tenantId);
  res.json({ success: true, data: rules });
});

// PUT /api/settings/automation-rules
router.put('/automation-rules', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const { rules } = req.body;

  if (!Array.isArray(rules)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Payload must contain rules array' },
    });
    return;
  }

  // ENFORCE IMMUTABLE SAFETY INVARIANTS:
  // 1. 1-3 star reviews must ALWAYS have action: 'REQUIRE_APPROVAL'
  // 2. maxRiskLevelForAutoPublish cannot be HIGH or CRITICAL
  const sanitizedRules: AutomationRule[] = rules.map((r: AutomationRule) => {
    let action = r.action;
    let maxRisk = r.maxRiskLevelForAutoPublish;

    if (r.starRating <= 3) {
      action = 'REQUIRE_APPROVAL';
    }
    if (maxRisk === 'HIGH' || maxRisk === 'CRITICAL') {
      maxRisk = 'LOW';
    }

    return {
      ...r,
      action,
      maxRiskLevelForAutoPublish: maxRisk,
      saasCustomerId: tenantId,
    };
  });

  const saved = await ruleRepo.saveRules(tenantId, sanitizedRules);

  await auditRepo.logEvent({
    id: `audit_${Date.now()}`,
    saasCustomerId: tenantId,
    actorUserId: req.auth!.userId,
    actorType: 'USER',
    action: 'UPDATE_AUTOMATION_RULES',
    targetResourceType: 'AUTOMATION_RULE',
    targetResourceId: 'rules_set',
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: saved });
});

// GET /api/settings/brand-voice
router.get('/brand-voice', async (req: AuthenticatedRequest, res) => {
  const voice = await brandVoiceRepo.getByTenant(req.auth!.tenantId);
  res.json({ success: true, data: voice });
});

// PUT /api/settings/brand-voice
router.put('/brand-voice', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const current = (await brandVoiceRepo.getByTenant(tenantId)) || {
    id: `bv_${tenantId}`,
    saasCustomerId: tenantId,
    tone: 'WARM_AND_PROFESSIONAL' as const,
    trustedBusinessContext: {
      ownerOrManagerTitle: 'General Manager',
      contactEmailForInquiries: 'support@business.com',
      coreServicesOffered: ['Service'],
      prohibitedTopics: ['No prices'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated: BrandVoice = {
    ...current,
    ...req.body,
    saasCustomerId: tenantId,
    updatedAt: new Date().toISOString(),
  };

  const saved = await brandVoiceRepo.save(tenantId, updated);

  await auditRepo.logEvent({
    id: `audit_${Date.now()}`,
    saasCustomerId: tenantId,
    actorUserId: req.auth!.userId,
    actorType: 'USER',
    action: 'UPDATE_BRAND_VOICE',
    targetResourceType: 'LOCATION',
    targetResourceId: saved.id,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: saved });
});

export default router;
