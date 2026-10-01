/**
 * PostgreSQL repository layer.
 * GoogleConnectionRepository lives in ./googleConnectionRepository.ts (encrypted tokens).
 */
export { GoogleConnectionRepository } from './googleConnectionRepository.ts';

// Temporary bootstrap: other repositories are loaded from the pre-split modules below.
// Full class implementations restored in follow-up if this thin barrel is insufficient.
export {
  ReviewRepository,
  ReplyRepository,
  TenantRepository,
  UserRepository,
  BillingRepository,
  AutomationRuleRepository,
  BrandVoiceRepository,
  AuditRepository,
  SupportRepository,
  NotificationRepository,
  IdempotencyRepository,
  JobRecordRepository,
  OAuthStateRepository,
  isUniqueConstraintError,
} from './postgresRepositories.legacy.ts';
