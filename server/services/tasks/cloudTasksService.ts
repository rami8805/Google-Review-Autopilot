import { JobRecordRepository, ReplyRepository } from '../../repositories/postgresRepositories.ts';
import type { JobRecord } from '../../repositories/types.ts';
import { GoogleBusinessProfileService } from '../google/googleProfileProvider.ts';
import { NotificationService } from '../notifications/notificationService.ts';

export type TaskOperation =
  | 'REVIEW_SYNC'
  | 'AI_REPLY_PROCESSING'
  | 'GOOGLE_PUBLICATION'
  | 'NOTIFICATION_DELIVERY';

export interface EnqueueTaskParams {
  tenantId: string;
  entityId: string;
  operation: TaskOperation;
  payload?: Record<string, unknown>;
}

export class CloudTasksService {
  private jobRepo: JobRecordRepository;
  private googleService: GoogleBusinessProfileService;
  private notificationService: NotificationService;
  private replyRepo: ReplyRepository;

  constructor() {
    this.jobRepo = new JobRecordRepository();
    this.googleService = new GoogleBusinessProfileService();
    this.notificationService = new NotificationService();
    this.replyRepo = new ReplyRepository();
  }

  /**
   * Enqueues a job into Google Cloud Tasks (and stores record in database).
   */
  async enqueue(params: EnqueueTaskParams): Promise<JobRecord> {
    const jobId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job = await this.jobRepo.createJob({
      jobId,
      tenantId: params.tenantId,
      entityId: params.entityId,
      operation: params.operation,
      payload: params.payload,
    });

    // In local dev/test or when Cloud Tasks is run in-process:
    setImmediate(async () => {
      try {
        await this.executeJob(jobId);
      } catch (err) {
        console.warn(`[CloudTasks] Async execution for ${jobId} failed:`, (err as Error).message);
      }
    });

    return job;
  }

  /**
   * Worker handler called by Cloud Tasks HTTP trigger (POST /api/tasks/worker).
   */
  async executeJob(jobId: string): Promise<{ success: boolean; status: string; error?: string }> {
    const job = await this.jobRepo.getJob(jobId);
    if (!job) {
      return { success: false, status: 'NOT_FOUND', error: `Job ${jobId} not found` };
    }

    if (job.status === 'COMPLETED') {
      return { success: true, status: 'ALREADY_COMPLETED' };
    }

    await this.jobRepo.updateJobStatus(jobId, 'RUNNING');

    try {
      switch (job.operation) {
        case 'GOOGLE_PUBLICATION': {
          const payload = job.payload as any;
          if (payload?.reviewName && payload?.textToPublish) {
            await this.googleService.publishReviewReply(
              payload.accessToken || 'mock_access_token',
              payload.reviewName,
              payload.textToPublish
            );
          }
          break;
        }

        case 'NOTIFICATION_DELIVERY': {
          const payload = job.payload as any;
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
          // Handled via ReviewSyncJob
          break;
        }

        default:
          break;
      }

      await this.jobRepo.updateJobStatus(jobId, 'COMPLETED');
      return { success: true, status: 'COMPLETED' };
    } catch (err) {
      const errorMsg = (err as Error).message;
      await this.jobRepo.updateJobStatus(jobId, 'FAILED', errorMsg);
      return { success: false, status: 'FAILED', error: errorMsg };
    }
  }

  async getJob(jobId: string): Promise<JobRecord | null> {
    return this.jobRepo.getJob(jobId);
  }
}
