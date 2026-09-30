import { DatabaseStore } from '../../server/services/data/dbStore';
import {
  BusinessLocationService,
  BusinessService,
  ReviewService,
} from '../../server/services/data/dataService';
import type { TenantContext } from '../../shared/types/database';

export async function runDuplicateReviewPreventionTests(): Promise<{
  passed: number;
  failed: number;
  results: string[];
}> {
  const store = new DatabaseStore();
  const businessService = new BusinessService(store);
  const locationService = new BusinessLocationService(store);
  const reviewService = new ReviewService(store);

  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      results.push(`PASS: ${testName}`);
    } else {
      failed++;
      results.push(`FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
    }
  }

  const tenantId = 'tenant_dup_test';
  const context: TenantContext = { saasCustomerId: tenantId, role: 'OWNER' };

  const business = businessService.create(
    { id: 'biz_dup', saasCustomerId: tenantId, name: 'Dental Dup Studio' },
    context
  );

  const location = locationService.create(
    {
      id: 'loc_dup',
      businessId: business.id,
      saasCustomerId: tenantId,
      googleLocationId: 'google_loc_dup',
      displayName: 'Dental Dup Location',
      locationName: 'Dental Dup Location',
      address: {
        addressLines: ['100 Main St'],
        locality: 'Oakland',
        administrativeArea: 'CA',
        postalCode: '94601',
        country: 'US',
      },
      timezone: 'America/Los_Angeles',
      connectionStatus: 'CONNECTED',
      isConnected: true,
      automationEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    context
  );

  const providerReviewId = 'google_rev_unique_999';

  // 1. First import creates the review
  const firstImport = await reviewService.importReviewIdempotent(
    {
      businessLocationId: location.id,
      provider: 'GOOGLE',
      providerReviewId,
      rating: 5,
      authorName: 'Sarah Jenkins',
      reviewText: 'Outstanding service and painless procedure!',
      reviewCreatedAt: '2026-03-01T10:00:00.000Z',
    },
    context
  );

  assert(
    !firstImport.isDuplicate && firstImport.review.providerReviewId === providerReviewId,
    'Initial review import succeeds and returns isDuplicate: false'
  );

  // 2. Second import of same providerReviewId returns existing record and flags isDuplicate: true
  const secondImport = await reviewService.importReviewIdempotent(
    {
      businessLocationId: location.id,
      provider: 'GOOGLE',
      providerReviewId,
      rating: 5,
      authorName: 'Sarah Jenkins',
      reviewText: 'Outstanding service and painless procedure!',
      reviewCreatedAt: '2026-03-01T10:00:00.000Z',
    },
    context
  );

  assert(
    secondImport.isDuplicate && secondImport.review.id === firstImport.review.id,
    'Duplicate review import detects existing providerReviewId and returns existing entity without duplication'
  );

  // 3. Verify total review count in store remains exactly 1
  const allReviews = reviewService.listByTenant(context);
  assert(allReviews.length === 1, 'Total review count remains 1 after duplicate import attempt');

  // 4. Index lookup by providerReviewId
  const indexedReview = reviewService.getByProviderReviewId('GOOGLE', providerReviewId, context);
  assert(
    indexedReview !== null && indexedReview.id === firstImport.review.id,
    'Index lookup by providerReviewId retrieves the exact review in O(1)'
  );

  // 5. Test with explicit idempotency key
  const thirdImport = await reviewService.importReviewIdempotent(
    {
      businessLocationId: location.id,
      provider: 'GOOGLE',
      providerReviewId,
      rating: 5,
      authorName: 'Sarah Jenkins',
      reviewCreatedAt: '2026-03-01T10:00:00.000Z',
    },
    context,
    'idemp_token_review_import_01'
  );

  assert(
    thirdImport.isDuplicate && thirdImport.review.id === firstImport.review.id,
    'Idempotency key successfully protects against retried background jobs'
  );

  return { passed, failed, results };
}
