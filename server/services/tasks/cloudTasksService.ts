import {
  JobRecordRepository,
  ReplyRepository,
  ReviewRepository,
  BillingRepository,
  GoogleConnectionRepository,
  AutomationRuleRepository,
  IdempotencyRepository,
  AuditRepository,
} from '../../repositories/postgresRepositories.ts';
import type { JobRecord } from '../../repositories/types.ts';
import { GoogleBusinessProfileService } from '../google/googleProfileProvider.ts';
import { NotificationService } from '../notifications/notificationService.ts';
import { CloudTasksClient } from '@google-cloud/tasks';

export type TaskQueueName = 'review-sync' | 'reply-publication' | 'notifications';

export type TaskOperation =
  | 'REVIEW_SYNC'
  | 'AI_REPLY_PROCESSING'
  | 'GOOGLE_PUBLICATION'
  | 'NOTIFICATION_DELIVERY';

export interface EnqueueTaskParams {
  tenantId: string;
  entityId: string;
  operation: TaskOperation;
  queueName?: TaskQueueName;
  correlationId?: string;
  payload?: Record<string, unknown>;
}

export class CloudTasksService {
  private jobRepo: JobRecordRepository;
  private reviewRepo: ReviewRepository;
  private replyRepo: ReplyRepository;
  private billingRepo: BillingRepository;
  private googleRepo: GoogleConnectionRepository;
  private ruleRepo: AutomationRuleRepository;
  private idempotencyRepo: IdempotencyRepository;
  private auditRepo: AuditRepository;
  private googleService: GoogleBusinessProfileService;
  private notificationService: NotificationService;
  private cloudTasks: CloudTasksClient | null;

  constructor() {
    this.jobRepo = new JobRecordRepository();
    this.reviewRepo = new ReviewRepository();
    this.replyRepo = new ReplyRepository();
    this.billingRepo = new BillingRepository();
    this.googleRepo = new GoogleConnectionRepository();
    this.ruleRepo = new AutomationRuleRepository();
    this.idempotencyRepo = new IdempotencyRepository();
    this.auditRepo = new AuditRepository();
    this.googleService = new GoogleBusinessProfileService();
    this.notificationService = new NotificationService();
    this.cloudTasks = process.env.NODE_ENV === 'production' ? new CloudTasksClient() : null;
  }

  /**
   * Resolves target Cloud Task queue for a given operation.
   */
  resolveQueue(operation: TaskOperation): TaskQueueName {
    switch (operation) {
      case 'REVIEW_SYNC':
      case 'AI_REPLY_PROCESSING':
        return 'review-sync';
      case 'GOOGLE_PUBLICATION':
        return 'reply-publication';
      case 'NOTIFICATION_DELIVERY':
        return 'notifications';
      default:
        return 'review-sync';
    }
  }

  /**
   * Enqueues a job into Google Cloud Tasks (and persists record in PostgreSQL).
   */
  async enqueue(params: EnqueueTaskParams): Promise<JobRecord> {
    const correlationId = params.correlationId || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const queueName = params.queueName || this.resolveQueue(params.operation);
    const jobId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    console.log(
      JSON.stringify({
        level: 'INFO',
        service: 'CloudTasks',
        event: 'TASK_ENQUEUED',
        jobId,
        correlationId,
        queueName,
        tenantId: params.tenantId,
        operation: params.operation,
        entityId: params.entityId,
        timestamp: new Date().toISOString(),
      })
    );

    const job = await this.jobRepo.createJob({
      jobId,
      tenantId: params.tenantId,
      entityId: params.entityId,
      operation: params.operation,
      payload: {
        ...(params.payload || {}),
        queueName,
        correlationId,
      },
    });

    if (this.cloudTasks) {
      const projectId = process.env.CLOUD_TASKS_PROJECT_ID;
      const location = process.env.CLOUD_TASKS_LOCATION;
      const queue = process.env.CLOUD_TASKS_QUEUE_NAME || queueName;
      const serviceUrl = process.env.APP_BASE_URL;
      if (!projectId || !location || !serviceUrl) throw new Error('Cloud Tasks production configuration is incomplete');
      const parent = this.cloudTasks.queuePath(projectId, location, queue);
      const task: any = {
        httpRequest: {
          httpMethod: 'POST',
          url: `${serviceUrl.replace(/\/$/, '')}/api/tasks/${queue}`,
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(JSON.stringify({ jobId, correlationId })),
        },
      };
      if (process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL) {
        task.httpRequest.oidcToken = {
          serviceAccountEmail: process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL,
          audience: serviceUrl,
        };
      }
      await this.cloudTasks.createTask({ parent, task });
    } else {
      setImmediate(async () => {
        try { await this.executeJob(jobId, correlationId); }
        catch (err) { console.warn(`[CloudTasks][${correlationId}] Background execution error for ${jobId}:`, (err as Error).message); }
      });
    }

    return job;
  }

  /**
   * Worker handler called by Cloud Tasks HTTP worker push triggers.
   */
  async executeJob(
    jobId: string,
    callerCorrelationId?: string
  ): Promise<{ success: boolean; status: string; error?: string; isPermanentError?: boolean }> {
    const job = await this.jobRepo.getJob(jobId);
    if (!job) {
      return { success: false, status: 'NOT_FOUND', error: `Job ${jobId} not found`, isPermanentError: true };
    }

    const correlationId = callerCorrelationId || (job.payload as any)?.correlationId || jobId;

    // Enforce idempotency: If already completed, exit safely without duplicate processing
    if (job.status === 'COMPLETED') {
      console.log(
        JSON.stringify({
          level: 'INFO',
          service: 'CloudTasksWorker',
          event: 'TASK_ALREADY_COMPLETED',
          jobId,
          correlationId,
          tenantId: job.tenantId,
          timestamp: new Date().toISOString(),
        })
      );
      return { success: true, status: 'ALREADY_COMPLETED' };
    }

    await this.jobRepo.updateJobStatus(jobId, 'RUNNING');

    try {
      switch (job.operation) {
        case 'GOOGLE_PUBLICATION': {
          const payload = (job.payload || {}) as any;
          const tenantId = job.tenantId;
          const reviewId = job.entityId;

          // 1. Load review and reply from PostgreSQL
          const review = await this.reviewRepo.getById(tenantId, reviewId);
          if (!review) {
            throw new PermanentError(`Review ${reviewId} not found for tenant ${tenantId}`);
          }

          // 2. Before publishing to Google: verify there is no already-published reply
          const existingReplies = await this.replyRepo.listRecentByLocation(
            tenantId,
            review.businessLocationId,
            10
          );
          const alreadyPublished = existingReplies.find(
            (r) =>
              r.reviewId === reviewId &&
              (r.status === 'AUTO_PUBLISHED' || r.status === 'MANUALLY_PUBLISHED') &&
              Boolean(r.publishedText)
          );

          if (alreadyPublished) {
            console.log(
              JSON.stringify({
                level: 'WARN',
                service: 'CloudTasksWorker',
                event: 'REPLY_ALREADY_PUBLISHED_ABORTED',
                jobId,
                reviewId,
                correlationId,
                tenantId,
              })
            );
            await this.jobRepo.updateJobStatus(jobId, 'COMPLETED');
            return { success: true, status: 'ALREADY_COMPLETED' };
          }

          // 3. Re-check subscription entitlement
          const sub = await this.billingRepo.getSubscription(tenantId);
          if (sub && sub.status === 'CANCELED') {
            throw new PermanentError('Subscription canceled: auto-publish strictly denied by entitlement policy');
          }

          // 4. Re-check Google connection validity
          const locations = await this.googleRepo.listLocations(tenantId);
          const location = locations.find((l) => l.id === review.businessLocationId) || locations[0];
          if (!location || !location.isConnected) {
            throw new PermanentError('Google connection invalid or location disconnected');
          }

          // 5. Re-check Reply Guard result & automation rules
          if (payload.guardDecision && payload.guardDecision !== 'AUTO_PUBLISH') {
            throw new PermanentError(`Reply Guard decision is ${payload.guardDecision}; cannot auto-publish`);
          }

          const rules = await this.ruleRepo.listByTenant(tenantId);
          const matchingRule = rules.find((r) => r.starRating === review.starRating && r.isActive);
          if (matchingRule && matchingRule.action !== 'AUTO_PUBLISH') {
            throw new PermanentError(`Automation rule action is ${matchingRule.action}; manual approval required`);
          }

          // 6. Idempotency lock on publish key
          const pubKey = `pub_${review.id}`;
          const isAcquired = await this.idempotencyRepo.acquireKey(
            tenantId,
            pubKey,
            'GOOGLE_PUBLICATION',
            review.googleReviewName
          );
          if (!isAcquired) {
            console.log(`[CloudTasksWorker][${correlationId}] Idempotency key locked for ${pubKey}`);
            await this.jobRepo.updateJobStatus(jobId, 'COMPLETED');
            return { success: true, status: 'ALREADY_COMPLETED' };
          }

          // 7. Publish to Google
          const textToPublish = payload.textToPublish || payload.proposedText;
          const connection = await this.googleRepo.getDecryptedTokens(tenantId, review.businessLocationId);
          if (!connection?.accessToken) throw new PermanentError('Google connection token unavailable');
          await this.googleService.publishReviewReply(connection.accessToken, review.googleReviewName, textToPublish);

          // 8. Update reply record
          if (review.replyId) {
            await this.replyRepo.update(tenantId, review.replyId, {
              status: 'AUTO_PUBLISHED',
              publishedText: textToPublish,
              publishedAt: new Date().toISOString(),
            });
          }

          await this.auditRepo.logEvent({
            id: `audit_${Date.now()}`,
            saasCustomerId: tenantId,
            actorType: 'SYSTEM_JOB',
            action: 'AUTO_PUBLISHED_REPLY',
            targetResourceType: 'REVIEW',
            targetResourceId: review.id,
            details: { jobId, textToPublish },
            timestamp: new Date().toISOString(),
          });

          await this.idempotencyRepo.complete(tenantId, pubKey, 'GOOGLE_PUBLICATION', 200, { published: true });
          break;
        }

        case 'NOTIFICATION_DELIVERY': {
          const payload = (job.payload || {}) as any;
          if (payload?.title && payload?.message) {
            await this.notificationService.dispatch({
              saasCustomerId: job.tenantId,
              type: payload.type || 'APPROVAL_REQUIRED',
              title: payload.title,
              message: payload.message,
              channel: payload.channel || 'IN_APP',
              linkUrl: payload.linkUrl,
            });
          }
          break;
        }

        case 'REVIEW_SYNC':
        case 'AI_REPLY_PROCESSING': {
          // Processed via ReviewSyncJob
          break;
        }

        default:
          break;
      }

      await this.jobRepo.updateJobStatus(jobId, 'COMPLETED');
      console.log(
        JSON.stringify({
          level: 'INFO',
          service: 'CloudTasksWorker',
          event: 'TASK_COMPLETED',
          jobId,
          correlationId,
          operation: job.operation,
          tenantId: job.tenantId,
          timestamp: new Date().toISOString(),
        })
      );
      return { success: true, status: 'COMPLETED' };
    } catch (err) {
      const errorMsg = (err as Error).message;
      const isPermanent = err instanceof PermanentError;

      console.error(
        JSON.stringify({
          level: 'ERROR',
          service: 'CloudTasksWorker',
          event: 'TASK_FAILED',
          jobId,
          correlationId,
          isPermanentError: isPermanent,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        })
      );

      await this.jobRepo.updateJobStatus(jobId, 'FAILED', errorMsg);
      return { success: false, status: 'FAILED', error: errorMsg, isPermanentError: isPermanent };
    }
  }

  async getJob(jobId: string): Promise<JobRecord | null> {
    return this.jobRepo.getJob(jobId);
  }
}

export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentError';
  }
}
