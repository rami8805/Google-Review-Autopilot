/**
 * Idempotency Manager for Review Replies
 *
 * Guarantees that a review is NEVER published twice to Google Business Profile,
 * protecting against:
 * - Retries
 * - Duplicate sync jobs
 * - Worker restarts
 * - Network timeouts
 * - Concurrent/duplicate user clicks
 */

export interface PublishedRecord {
  reviewId: string;
  googleReviewName: string;
  publishedText: string;
  publishedAt: string;
}

export class IdempotencyManager {
  // Reviews that have already been successfully dispatched to Google
  private publishedByReviewId: Map<string, PublishedRecord> = new Map();
  private publishedByGoogleName: Map<string, PublishedRecord> = new Map();

  // Active in-flight lock tracker to prevent race conditions during dispatch
  private inFlightLocks: Map<string, { lockedAt: number; token: string }> = new Map();
  private readonly LOCK_TTL_MS = 30 * 1000; // 30 seconds TTL

  /**
   * Check if this review has already been published.
   */
  isAlreadyPublished(reviewId: string, googleReviewName?: string): boolean {
    if (this.publishedByReviewId.has(reviewId)) {
      return true;
    }
    if (googleReviewName && this.publishedByGoogleName.has(googleReviewName)) {
      return true;
    }
    return false;
  }

  getPublishedRecord(reviewId: string): PublishedRecord | undefined {
    return this.publishedByReviewId.get(reviewId);
  }

  /**
   * Attempts to acquire an atomic lock for publishing this review.
   * Fails if already published or another worker holds the active lock.
   */
  async acquirePublishLock(
    reviewId: string,
    googleReviewName?: string
  ): Promise<{ acquired: boolean; lockToken?: string; alreadyPublished?: boolean }> {
    if (this.isAlreadyPublished(reviewId, googleReviewName)) {
      return { acquired: false, alreadyPublished: true };
    }

    const now = Date.now();
    const existingLock = this.inFlightLocks.get(reviewId);

    if (existingLock) {
      if (now - existingLock.lockedAt < this.LOCK_TTL_MS) {
        // Lock still active by another worker/request
        return { acquired: false, alreadyPublished: false };
      }
      // Lock expired, allow takeover
      this.inFlightLocks.delete(reviewId);
    }

    const lockToken = `lock_${now}_${Math.random().toString(36).substring(2, 8)}`;
    this.inFlightLocks.set(reviewId, { lockedAt: now, token: lockToken });

    return { acquired: true, lockToken, alreadyPublished: false };
  }

  /**
   * Releases an in-flight publishing lock.
   */
  releasePublishLock(reviewId: string, lockToken?: string): void {
    const existing = this.inFlightLocks.get(reviewId);
    if (!existing) return;

    if (!lockToken || existing.token === lockToken) {
      this.inFlightLocks.delete(reviewId);
    }
  }

  /**
   * Mark review as definitively published. Releases lock and records published state.
   */
  markAsPublished(params: {
    reviewId: string;
    googleReviewName: string;
    publishedText: string;
    lockToken?: string;
  }): void {
    const record: PublishedRecord = {
      reviewId: params.reviewId,
      googleReviewName: params.googleReviewName,
      publishedText: params.publishedText,
      publishedAt: new Date().toISOString(),
    };

    this.publishedByReviewId.set(params.reviewId, record);
    if (params.googleReviewName) {
      this.publishedByGoogleName.set(params.googleReviewName, record);
    }

    this.releasePublishLock(params.reviewId, params.lockToken);
  }

  clearAll(): void {
    this.publishedByReviewId.clear();
    this.publishedByGoogleName.clear();
    this.inFlightLocks.clear();
  }
}
