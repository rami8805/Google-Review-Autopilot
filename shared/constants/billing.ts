import type { PlanDefinition, SubscriptionPlan, PlanFeatureLimits } from '../types/domain';

export const DEFAULT_TRIAL_DURATION_DAYS = 14;

export const PLAN_CATALOG: Record<SubscriptionPlan, PlanDefinition> = {
  TRIAL: {
    id: 'TRIAL',
    name: '14-Day Free Trial',
    description: 'Full-featured trial to experience safe review autopilot',
    priceCents: 0,
    currency: 'USD',
    billingInterval: 'month',
    trialDays: DEFAULT_TRIAL_DURATION_DAYS,
    limits: {
      locationLimit: 1,
      monthlyReplyLimit: 50,
      hasReviewAutomation: true,
      hasApprovalWorkflow: true,
      hasBrandVoice: true,
      hasGoogleIntegration: true,
      hasSupport: true,
      hasReviewHistory: true,
    },
  },
  FREE: {
    id: 'FREE',
    name: 'Free',
    description: 'Basic manual review browsing',
    priceCents: 0,
    currency: 'USD',
    billingInterval: 'month',
    trialDays: 0,
    limits: {
      locationLimit: 1,
      monthlyReplyLimit: 5,
      hasReviewAutomation: false,
      hasApprovalWorkflow: false,
      hasBrandVoice: false,
      hasGoogleIntegration: true,
      hasSupport: false,
      hasReviewHistory: true,
    },
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    description: 'Safe AI Google Review Autopilot for local businesses',
    priceCents: 2900, // $29 / month
    currency: 'USD',
    billingInterval: 'month',
    trialDays: 14,
    limits: {
      locationLimit: 1,
      monthlyReplyLimit: 100,
      hasReviewAutomation: true,
      hasApprovalWorkflow: true,
      hasBrandVoice: true,
      hasGoogleIntegration: true,
      hasSupport: true,
      hasReviewHistory: true,
    },
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    description: 'Single location local practice tier',
    priceCents: 2900, // $29 / month
    currency: 'USD',
    billingInterval: 'month',
    trialDays: 14,
    limits: {
      locationLimit: 1,
      monthlyReplyLimit: 50,
      hasReviewAutomation: true,
      hasApprovalWorkflow: true,
      hasBrandVoice: true,
      hasGoogleIntegration: true,
      hasSupport: true,
      hasReviewHistory: true,
    },
  },
  GROWTH: {
    id: 'GROWTH',
    name: 'Growth',
    description: 'Up to 3 branch clinics or locations',
    priceCents: 6900, // $69 / month
    currency: 'USD',
    billingInterval: 'month',
    trialDays: 0,
    limits: {
      locationLimit: 3,
      monthlyReplyLimit: 250,
      hasReviewAutomation: true,
      hasApprovalWorkflow: true,
      hasBrandVoice: true,
      hasGoogleIntegration: true,
      hasSupport: true,
      hasReviewHistory: true,
    },
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Multi-location franchise and regional practices',
    priceCents: 14900, // $149 / month
    currency: 'USD',
    billingInterval: 'month',
    trialDays: 0,
    limits: {
      locationLimit: 10,
      monthlyReplyLimit: 1000,
      hasReviewAutomation: true,
      hasApprovalWorkflow: true,
      hasBrandVoice: true,
      hasGoogleIntegration: true,
      hasSupport: true,
      hasReviewHistory: true,
    },
  },
};

export function getPlanDefinition(plan: SubscriptionPlan): PlanDefinition {
  return PLAN_CATALOG[plan] || PLAN_CATALOG.PRO;
}

export function isPlanFeatureEnabled(plan: SubscriptionPlan, feature: keyof PlanFeatureLimits): boolean {
  const planDef = getPlanDefinition(plan);
  const value = planDef.limits[feature];
  return typeof value === 'boolean' ? value : false;
}
