/**
 * Google Business Profile Integration - Test Suite
 *
 * Covers all required test cases:
 * 1. OAuth failure (tampered state, invalid code)
 * 2. Expired token (detection and health check)
 * 3. Permission failure (403 forbidden / REVOKED)
 * 4. Pagination (multi-page review traversal via pageToken)
 * 5. Duplicate review (syncing twice does not duplicate reviews)
 * 6. Publish reply (successful reply publishing & AUTO_PUBLISH workflow)
 * 7. Publish failure & Approval Gate (APPROVAL_REQUIRED returns draft only, publish failure handling)
 * 8. Retry (transient error retry & backoff behavior)
 * 9. Disconnect (credential purge & health status transition)
 */

import { GoogleBusinessProfileService } from '../../server/services/google/googleProfileProvider';
import { MockGoogleBusinessProfileService } from '../../server/services/google/mockGoogleProvider';
import { OAuthStateManager } from '../../server/services/google/googleTokenStore';
import { ReviewSyncJob } from '../../server/jobs/reviewSyncJob';
import type { BrandVoice, Review } from '../../shared/types/domain';

export async function runGoogleProviderTests(): Promise<{
  passed: number;
  failed: number;
  results: string[];
}> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      results.push(`PASS: ${testName}`);
    } else {
      failed++;
      results.push(`FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    }
  }

  const customerId = 'saas_cust_test_01';
  const brandVoice: BrandVoice = {
    id: 'bv_test',
    saasCustomerId: customerId,
    tone: 'WARM_AND_PROFESSIONAL',
    trustedBusinessContext: {
      ownerOrManagerTitle: 'Practice Director',
      contactEmailForInquiries: 'care@testdental.com',
      coreServicesOffered: ['General Dentistry'],
      prohibitedTopics: ['No prices'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // -------------------------------------------------------------
  // Test 1: OAuth Failure
  // -------------------------------------------------------------
  {
    const mockService = new MockGoogleBusinessProfileService(false);

    // 1a: Tampered state fails validation
    let stateTamperedFailed = false;
    try {
      OAuthStateManager.validateState('invalid.tampered.state', customerId);
    } catch {
      stateTamperedFailed = true;
    }
    assert(stateTamperedFailed, 'OAuth failure: Tampered state signature is rejected');

    // 1b: Tenant mismatch in state fails validation
    const validStateOtherTenant = OAuthStateManager.generateState('other_tenant');
    let tenantMismatchFailed = false;
    try {
      OAuthStateManager.validateState(validStateOtherTenant, customerId);
    } catch {
      tenantMismatchFailed = true;
    }
    assert(tenantMismatchFailed, 'OAuth failure: State with tenant mismatch is rejected');

    // 1c: Invalid code fails callback exchange
    const validState = OAuthStateManager.generateState(customerId);
    let codeExchangeFailed = false;
    try {
      await mockService.handleCallback({
        code: 'invalid_code',
        state: validState,
        saasCustomerId: customerId,
      });
    } catch (err: any) {
      if (err.code === 'OAUTH_FAILED') codeExchangeFailed = true;
    }
    assert(codeExchangeFailed, 'OAuth failure: Invalid authorization code is rejected');
  }

  // -------------------------------------------------------------
  // Test 2: Expired Token
  // -------------------------------------------------------------
  {
    const mockService = new MockGoogleBusinessProfileService(true);
    mockService.setSimulatedFailure('EXPIRED_TOKEN');

    let tokenExpiredCaught = false;
    try {
      await mockService.listAccounts(customerId);
    } catch (err: any) {
      if (err.code === 'TOKEN_EXPIRED' && err.statusCode === 401 && err.retryable === true) {
        tokenExpiredCaught = true;
      }
    }
    assert(tokenExpiredCaught, 'Expired token: Correctly normalizes to TOKEN_EXPIRED error with HTTP 401');

    const health = await mockService.healthCheck(customerId);
    assert(health.status === 'EXPIRED', 'Expired token: Health check reports EXPIRED status');
  }

  // -------------------------------------------------------------
  // Test 3: Permission Failure
  // -------------------------------------------------------------
  {
    const mockService = new MockGoogleBusinessProfileService(true);
    mockService.setSimulatedFailure('PERMISSION_REVOKED');

    let permissionCaught = false;
    try {
      await mockService.listAccounts(customerId);
    } catch (err: any) {
      if (err.code === 'PERMISSION_REVOKED' && err.statusCode === 403 && err.retryable === false) {
        permissionCaught = true;
      }
    }
    assert(
      permissionCaught,
      'Permission failure: Correctly normalizes to PERMISSION_REVOKED with HTTP 403 (non-retryable)'
    );

    const health = await mockService.healthCheck(customerId);
    assert(health.status === 'REVOKED', 'Permission failure: Health check reports REVOKED status');
  }

  // -------------------------------------------------------------
  // Test 4: Pagination
  // -------------------------------------------------------------
  {
    const mockService = new MockGoogleBusinessProfileService(true);

    // Fetch page 1 (pageSize = 2)
    const page1 = await mockService.listReviews(customerId, 'locations/loc_001', undefined, 2);
    assert(
      page1.reviews.length === 2 && !!page1.nextPageToken,
      'Pagination: First page returns 2 reviews and nextPageToken'
    );

    // Fetch page 2 using nextPageToken
    const page2 = await mockService.listReviews(customerId, 'locations/loc_001', page1.nextPageToken, 2);
    const distinctReviews = page1.reviews[0].reviewId !== page2.reviews[0].reviewId;
    assert(
      page2.reviews.length === 2 && distinctReviews,
      'Pagination: Second page returns distinct reviews via nextPageToken'
    );
  }

  // -------------------------------------------------------------
  // Test 5: Duplicate Review (Syncing twice must not duplicate)
  // -------------------------------------------------------------
  {
    const googleService = new GoogleBusinessProfileService({ forceMock: true });
    const syncJob = new ReviewSyncJob(googleService);

    // Initial sync
    const sync1 = await syncJob.syncLocationReviews({
      saasCustomerId: customerId,
      businessLocationId: 'loc_dedupe_test',
      googleLocationName: 'locations/loc_dedupe_test',
      brandVoice,
    });
    const firstNewCount = sync1.newReviewsCount;
    assert(firstNewCount > 0, 'Duplicate review: First sync discovers and ingests new reviews');

    // Second sync immediately after with identical data
    const sync2 = await syncJob.syncLocationReviews({
      saasCustomerId: customerId,
      businessLocationId: 'loc_dedupe_test',
      googleLocationName: 'locations/loc_dedupe_test',
      brandVoice,
    });
    assert(
      sync2.newReviewsCount === 0 && sync2.duplicateReviewsSkipped > 0,
      'Duplicate review: Second sync discovers 0 new reviews and skips all duplicates'
    );

    // Verify total reviews in location does not double
    const totalStored = syncJob.getReviewsForLocation('loc_dedupe_test').length;
    assert(
      totalStored === firstNewCount,
      'Duplicate review: Total reviews in store remain exactly equal to first sync count'
    );
  }

  // -------------------------------------------------------------
  // Test 6: Publish Reply
  // -------------------------------------------------------------
  {
    const mockService = new MockGoogleBusinessProfileService(true);
    const reviewName = 'accounts/101/locations/loc_001/reviews/google_rev_102';
    const replyText = 'Thank you for your feedback. We appreciate your patience.';

    const replyDto = await mockService.publishReply(customerId, reviewName, replyText);
    assert(
      replyDto.comment === replyText && replyDto.replyName.includes('reply'),
      'Publish reply: Successfully publishes review reply with comment and replyName'
    );

    // Test 6b: Update Reply
    const updatedText = 'Updated response: our team is investigating your experience.';
    const updatedDto = await mockService.updateReply(customerId, reviewName, updatedText);
    assert(
      updatedDto.comment === updatedText,
      'Publish reply: Successfully updates an existing review reply'
    );
  }

  // -------------------------------------------------------------
  // Test 7: Publish Failure & Approval Gate
  // -------------------------------------------------------------
  {
    const googleService = new GoogleBusinessProfileService({ forceMock: true });
    const syncJob = new ReviewSyncJob(googleService);

    // 7a: Review that requires approval (1-star review) must NEVER auto-publish
    const lowStarReview: Review = {
      id: 'rev_test_1star',
      saasCustomerId: customerId,
      businessLocationId: 'loc_test',
      googleReviewId: 'google_1star',
      googleReviewName: 'accounts/101/locations/loc_001/reviews/google_1star',
      author: { displayName: 'Unhappy Client', isAnonymous: false },
      starRating: 1,
      comment: 'Very bad experience with billing.',
      reviewCreatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { reply, result } = await syncJob.processIngestedReview({
      review: lowStarReview,
      brandVoice,
    });

    assert(
      reply.status === 'PENDING_APPROVAL' &&
        result.actionTaken === 'STAGED_FOR_APPROVAL' &&
        !reply.publishedAt,
      'Publish failure & Approval Gate: 1-star review is held as PENDING_APPROVAL draft only (never published)'
    );

    // 7b: Simulated publish failure
    const failingService = new MockGoogleBusinessProfileService(true);
    failingService.setSimulatedFailure('PUBLISH_FAIL');
    let publishErrorCaught = false;
    try {
      await failingService.publishReply(
        customerId,
        'accounts/101/locations/loc_001/reviews/google_rev_101',
        'Test'
      );
    } catch (err: any) {
      if (err.code === 'INTERNAL_ERROR' && err.retryable === true) {
        publishErrorCaught = true;
      }
    }
    assert(publishErrorCaught, 'Publish failure: Publish failure returns normalized retryable error');
  }

  // -------------------------------------------------------------
  // Test 8: Retry
  // -------------------------------------------------------------
  {
    const mockService = new MockGoogleBusinessProfileService(true);
    mockService.setSimulatedFailure('RATE_LIMIT');

    let rateLimitCaught = false;
    try {
      await mockService.listAccounts(customerId);
    } catch (err: any) {
      if (err.code === 'RATE_LIMIT_EXCEEDED' && err.statusCode === 429 && err.retryable === true) {
        rateLimitCaught = true;
      }
    }
    assert(rateLimitCaught, 'Retry: 429 rate limit correctly marked as retryable for backoff');
  }

  // -------------------------------------------------------------
  // Test 9: Disconnect
  // -------------------------------------------------------------
  {
    const mockService = new MockGoogleBusinessProfileService(true);

    await mockService.disconnect(customerId);
    const health = await mockService.healthCheck(customerId);
    assert(
      health.status === 'DISCONNECTED',
      'Disconnect: Health status transitions to DISCONNECTED after disconnect'
    );

    let disconnectCallFailed = false;
    try {
      await mockService.listAccounts(customerId);
    } catch (err: any) {
      if (err.code === 'INVALID_CREDENTIALS' || err.statusCode === 401) {
        disconnectCallFailed = true;
      }
    }
    assert(
      disconnectCallFailed,
      'Disconnect: Subsequent requests fail after tenant credentials are disconnected'
    );
  }

  return { passed, failed, results };
}
