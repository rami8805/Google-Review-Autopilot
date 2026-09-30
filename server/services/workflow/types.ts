/**
 * Workflow and Automation Domain Types
 */

import type {
  Review,
  ReviewReply,
  RiskAssessment,
  ReplyDecisionAction,
  AutomationRule,
  BrandVoice,
  AuditEvent,
  Notification,
} from '../../../shared/types/domain';

export type AutomationMode = 'SAFE' | 'BALANCED' | 'FULL';

export type WorkflowAuditAction =
  | 'review received'
  | 'AI analyzed'
  | 'draft generated'
  | 'auto-approved'
  | 'approval requested'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'publish failed'
  | 'automation paused'
  | 'automation resumed';

export interface LocationAutomationConfig {
  saasCustomerId: string;
  businessLocationId: string;
  mode: AutomationMode;
  isPaused: boolean;
  pausedAt?: string;
  pausedReason?: string;
  pausedByUserId?: string;
  updatedAt: string;
}

export interface UsageGuardConfig {
  maxAiCallsPerHour: number;
  maxBurstPerMinute: number;
}

export interface PublishResult {
  success: boolean;
  replyName?: string;
  publishedAt?: string;
  error?: string;
  isPermanentAuthFailure: boolean;
  attemptsMade: number;
}

export interface WorkflowProcessResult {
  review: Review;
  reply: ReviewReply;
  decision: ReplyDecisionAction;
  riskAssessment: RiskAssessment;
  isSensitive: boolean;
  published: boolean;
  publishResult?: PublishResult;
  auditEventsRecorded: AuditEvent[];
  notificationsDispatched: Notification[];
}

export interface IngestionOptions {
  actorUserId?: string;
  skipAutoPublish?: boolean;
  forceRegenerate?: boolean;
}
