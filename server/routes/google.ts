/**
 * Google Business Profile Integration Routes
 *
 * Exposes endpoints for:
 * - OAuth connection initiation & anti-CSRF state validation
 * - Account discovery
 * - Location discovery
 * - Review sync ("Sync now")
 * - Review reply publishing, updating, deleting
 * - Connection health monitoring
 * - Disconnect & credential purge
 *
 * Security:
 * - Access tokens and secrets NEVER returned to browser.
 * - Errors normalized with code and retryable flags.
 */

import { Router, Request, Response } from 'express';
import type { ApiSuccessResponse, ApiErrorResponse } from '../../shared/types/api';
import { GoogleBusinessProfileService } from '../services/google/googleProfileProvider';
import { GoogleProviderError, normalizeGoogleError } from '../services/google/googleErrors';
import { reviewSyncJob } from '../jobs/reviewSyncJob';
import type { BrandVoice } from '../../shared/types/domain';

export const googleRouter = Router();
const googleService = new GoogleBusinessProfileService();

// Default demo customer ID
const DEFAULT_CUSTOMER_ID = 'saas_cust_demo_01';

function sendSuccess<T>(res: Response, data: T, pagination?: any) {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      pagination,
    },
  };
  return res.json(payload);
}

function sendGoogleError(res: Response, err: unknown) {
  const normalized = normalizeGoogleError(err);
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code: normalized.toApiErrorCode(),
      message: normalized.message,
      details: {
        providerError: normalized.toProviderErrorDetail(),
      },
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(normalized.statusCode).json(payload);
}

/**
 * 1. OAuth Connect: Generates anti-CSRF state and authorization URL
 * GET /api/google/connect
 */
googleRouter.get('/connect', async (req: Request, res: Response) => {
  try {
    const saasCustomerId = (req.query.saasCustomerId as string) || DEFAULT_CUSTOMER_ID;
    const redirectUri = req.query.redirectUri as string | undefined;

    const result = await googleService.connect({
      saasCustomerId,
      redirectUri,
    });

    return sendSuccess(res, {
      authUrl: result.authUrl,
      state: result.state,
    });
  } catch (err) {
    return sendGoogleError(res, err);
  }
});

/**
 * 2. OAuth Callback: Validates state and exchanges code for tokens
 * GET /api/google/callback
 */
googleRouter.get('/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const saasCustomerId = (req.query.saasCustomerId as string) || DEFAULT_CUSTOMER_ID;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing code or state parameter in OAuth callback.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { accountId } = await googleService.handleCallback({
      code,
      state,
      saasCustomerId,
    });

    // Note: Tokens are saved encrypted server-side; NEVER returned in response
    return sendSuccess(res, {
      connected: true,
      googleAccountId: accountId,
      message: 'Google Business Profile connected successfully.',
    });
  } catch (err) {
    return sendGoogleError(res, err);
  }
});

/**
 * 3. Connection Health Check
 * GET /api/google/health
 */
googleRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const saasCustomerId = (req.query.saasCustomerId as string) || DEFAULT_CUSTOMER_ID;
    const health = await googleService.healthCheck(saasCustomerId);
    return sendSuccess(res, health);
  } catch (err) {
    return sendGoogleError(res, err);
  }
});

/**
 * 4. Account Discovery
 * GET /api/google/accounts
 */
googleRouter.get('/accounts', async (req: Request, res: Response) => {
  try {
    const saasCustomerId = (req.query.saasCustomerId as string) || DEFAULT_CUSTOMER_ID;
    const accounts = await googleService.listAccounts(saasCustomerId);
    return sendSuccess(res, accounts);
  } catch (err) {
    return sendGoogleError(res, err);
  }
});

/**
 * 5. Location Discovery
 * GET /api/google/locations
 */
googleRouter.get('/locations', async (req: Request, res: Response) => {
  try {
    const saasCustomerId = (req.query.saasCustomerId as string) || DEFAULT_CUSTOMER_ID;
    const accountId = (req.query.accountId as string) || 'accounts/1089274910284';
    const locations = await googleService.listLocations(saasCustomerId, accountId);
    return sendSuccess(res, locations);
  } catch (err) {
    return sendGoogleError(res, err);
  }
});

/**
 * 6. Review Retrieval & Pagination
 * GET /api/google/reviews
 */
googleRouter.get('/reviews', async (req: Request, res: Response) => {
  try {
    const saasCustomerId = (req.query.saasCustomerId as string) || DEFAULT_CUSTOMER_ID;
    const locationName = (req.query.locationName as string) || 'locations/1089274910284';
    const pageToken = req.query.pageToken as string | undefined;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;

    const data = await googleService.listReviews(saasCustomerId, locationName, pageToken, pageSize);
    return sendSuccess(res, data);
  } catch (err) {
    return sendGoogleError(res, err);
  }
});

/**
 * 7. "Sync Now" - Trigger review synchronization with deduplication
 * POST /api/google/sync-reviews
 */
googleRouter.post('/sync-reviews', async (req: Request, res: Response) => {
  try {
    const saasCustomerId = req.body?.saasCustomerId || DEFAULT_CUSTOMER_ID;
    const businessLocationId = req.body?.businessLocationId || 'loc_001';
    const googleLocationName = req.body?.googleLocationName || 'locations/1089274910284';

    const brandVoice: BrandVoice = req.body?.brandVoice || {
      id: 'bv_001',
      saasCustomerId,
      tone: 'WARM_AND_PROFESSIONAL',
      trustedBusinessContext: {
        ownerOrManagerTitle: 'Practice Director',
        contactEmailForInquiries: 'care@downtowndental-sf.com',
        contactPhoneForInquiries: '+1-415-555-0199',
        coreServicesOffered: ['General Dentistry', 'Cleanings'],
        prohibitedTopics: ['No prices over reviews'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await reviewSyncJob.syncLocationReviews({
      saasCustomerId,
      businessLocationId,
      googleLocationName,
      brandVoice,
      rules: req.body?.rules,
    });

    return sendSuccess(res, result);
  } catch (err) {
    return sendGoogleError(res, err);
  }
});

/**
 * 8. Reply Publishing (Manual or Approved)
 * POST /api/google/reviews/:reviewId/reply
 */
googleRouter.post('/reviews/:reviewId/reply', async (req: Request, res: Response) => {
  try {
    const saasCustomerId = req.body?.saasCustomerId || DEFAULT_CUSTOMER_ID;
    const { comment, googleReviewName } = req.body || {};

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Reply comment text is required.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const reviewName =
      googleReviewName ||
      `accounts/101/locations/loc_001/reviews/${req.params.reviewId}`;

    const published = await googleService.publishReply(saasCustomerId, reviewName, comment);
    return sendSuccess(res, published);
  } catch (err) {
    return sendGoogleError(res, err);
  }
});

/**
 * 9. Reply Updating
 * PUT /api/google/reviews/:reviewId/reply
 */
googleRouter.put('/reviews/:reviewId/reply', async (req: Request, res: Response) => {
  try {
    const saasCustomerId = req.body?.saasCustomerId || DEFAULT_CUSTOMER_ID;
    const { comment, googleReviewName } = req.body || {};

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Updated comment text is required.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const reviewName =
      googleReviewName ||
      `accounts/101/locations/loc_001/reviews/${req.params.reviewId}`;

    const updated = await googleService.updateReply(saasCustomerId, reviewName, comment);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendGoogleError(res, err);
  }
});

/**
 * 10. Reply Deletion
 * DELETE /api/google/reviews/:reviewId/reply
 */
googleRouter.delete('/reviews/:reviewId/reply', async (req: Request, res: Response) => {
  try {
    const saasCustomerId = (req.query.saasCustomerId as string) || DEFAULT_CUSTOMER_ID;
    const googleReviewName =
      (req.query.googleReviewName as string) ||
      `accounts/101/locations/loc_001/reviews/${req.params.reviewId}`;

    await googleService.deleteReply(saasCustomerId, googleReviewName);
    return sendSuccess(res, { deleted: true, reviewId: req.params.reviewId });
  } catch (err) {
    return sendGoogleError(res, err);
  }
});

/**
 * 11. Disconnect
 * POST /api/google/disconnect
 */
googleRouter.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const saasCustomerId = req.body?.saasCustomerId || DEFAULT_CUSTOMER_ID;
    await googleService.disconnect(saasCustomerId);
    return sendSuccess(res, {
      disconnected: true,
      message: 'Google Business Profile disconnected and stored credentials purged.',
    });
  } catch (err) {
    return sendGoogleError(res, err);
  }
});
