/**
 * Review Reply Dispatch Publisher
 *
 * Implements resilient publishing with:
 * - Strict idempotency locks (never publish twice)
 * - Intelligent retry policy:
 *   * Retries transient provider failures (500, 503, timeouts, 429) with backoff
 *   * Never retries permanent authorization failures (401, 403, PERMISSION_REVOKED)
 */

import { GoogleBusinessProfileService } from '../google/googleProfileProvider';
import { IdempotencyManager } from './idempotencyManager';
import type { PublishResult } from './types';

export interface IPublishPublisher {
  publishReply(params: {
    reviewId: string;
    googleReviewName: string;
    replyText: string;
    accessToken?: string;
  }): Promise<PublishResult>;
}

export class PublishPublisher implements IPublishPublisher {
  private googleService: GoogleBusinessProfileService;
  private idempotencyManager: IdempotencyManager;
  private maxRetries: number;
  private baseDelayMs: number;

  constructor(options?: {
    googleService?: GoogleBusinessProfileService;
    idempotencyManager?: IdempotencyManager;
    maxRetries?: number;
    baseDelayMs?: number;
  }) {
    this.googleService = options?.googleService || new GoogleBusinessProfileService();
    this.idempotencyManager = options?.idempotencyManager || new IdempotencyManager();
    this.maxRetries = options?.maxRetries ?? 3;
    this.baseDelayMs = options?.baseDelayMs ?? 100;
  }

  /**
   * Determine if an error is a permanent authorization failure.
   */
  isPermanentAuthFailure(error: unknown): boolean {
    if (!error) return false;
    const msg = error instanceof Error ? error.message : String(error);
    const lower = msg.toLowerCase();

    return (
      lower.includes('permission_revoked') ||
      lower.includes('invalid_grant') ||
      lower.includes('invalid_token') ||
      lower.includes('unauthorized') ||
      lower.includes('401') ||
      lower.includes('403') ||
      lower.includes('forbidden') ||
      lower.includes('insufficient_scope') ||
      lower.includes('account deleted')
    );
  }

  async publishReply(params: {
    reviewId: string;
    googleReviewName: string;
    replyText: string;
    accessToken?: string;
  }): Promise<PublishResult> {
    const { reviewId, googleReviewName, replyText, accessToken = 'mock_access_token' } = params;

    // 1. Check idempotency: Has this review already been published?
    if (this.idempotencyManager.isAlreadyPublished(reviewId, googleReviewName)) {
      const existing = this.idempotencyManager.getPublishedRecord(reviewId);
      return {
        success: true,
        replyName: `${googleReviewName}/reply`,
        publishedAt: existing?.publishedAt || new Date().toISOString(),
        isPermanentAuthFailure: false,
        attemptsMade: 0,
      };
    }

    // 2. Acquire atomic publish lock
    const lockResult = await this.idempotencyManager.acquirePublishLock(reviewId, googleReviewName);
    if (!lockResult.acquired) {
      if (lockResult.alreadyPublished) {
        return {
          success: true,
          replyName: `${googleReviewName}/reply`,
          isPermanentAuthFailure: false,
          attemptsMade: 0,
        };
      }
      return {
        success: false,
        error: 'Concurrent publish in progress for this review. Request locked.',
        isPermanentAuthFailure: false,
        attemptsMade: 0,
      };
    }

    const lockToken = lockResult.lockToken;
    let attemptsMade = 0;
    let lastError: Error | null = null;

    // 3. Retry loop for transient failures
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      attemptsMade = attempt;
      try {
        const result = await this.googleService.publishReviewReply(
          accessToken,
          googleReviewName,
          replyText
        );

        // Success! Mark published in idempotency manager (releases lock)
        this.idempotencyManager.markAsPublished({
          reviewId,
          googleReviewName,
          publishedText: replyText,
          lockToken,
        });

        return {
          success: true,
          replyName: result.replyName,
          publishedAt: result.updateTime,
          isPermanentAuthFailure: false,
          attemptsMade,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // If permanent authorization failure: STOP immediately, do not retry!
        if (this.isPermanentAuthFailure(lastError)) {
          this.idempotencyManager.releasePublishLock(reviewId, lockToken);
          return {
            success: false,
            error: lastError.message,
            isPermanentAuthFailure: true,
            attemptsMade,
          };
        }

        // Transient failure: Wait with backoff before next attempt
        if (attempt < this.maxRetries) {
          const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    // Retries exhausted
    this.idempotencyManager.releasePublishLock(reviewId, lockToken);
    return {
      success: false,
      error: lastError ? lastError.message : 'Retries exhausted while dispatching review reply.',
      isPermanentAuthFailure: false,
      attemptsMade,
    };
  }
}
