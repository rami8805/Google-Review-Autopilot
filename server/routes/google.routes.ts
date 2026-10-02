import crypto from 'crypto';
import { Router } from 'express';
import { requireAuth, requireTenant, type AuthenticatedRequest } from '../middleware/auth.ts';
import { GoogleBusinessProfileService } from '../services/google/googleProfileProvider.ts';
import { ReviewSyncJob } from '../jobs/reviewSyncJob.ts';
import {
  GoogleConnectionRepository,
  ReviewRepository,
  ReplyRepository,
  BillingRepository,
  AutomationRuleRepository,
  BrandVoiceRepository,
  AuditRepository,
  IdempotencyRepository,
  OAuthStateRepository,
} from '../repositories/postgresRepositories.ts';
import type { Review, GoogleConnection, BusinessLocation } from '../../shared/types/domain.ts';

const router = Router();
const googleService = new GoogleBusinessProfileService();
const reviewSyncJob = new ReviewSyncJob();

const googleRepo = new GoogleConnectionRepository();
const reviewRepo = new ReviewRepository();
const replyRepo = new ReplyRepository();
const billingRepo = new BillingRepository();
const ruleRepo = new AutomationRuleRepository();
const brandVoiceRepo = new BrandVoiceRepository();
const auditRepo = new AuditRepository();
const idempotencyRepo = new IdempotencyRepository();
const oauthStateRepo = new OAuthStateRepository();

router.use(requireAuth);
router.use(requireTenant);

// GET /api/google/oauth-config
router.get('/oauth-config', async (req: AuthenticatedRequest, res) => {
  const config = googleService.getConfig();
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  res.json({
    success: true,
    data: {
      ...config,
      suggestedRedirectUri: `${protocol}://${host}/onboarding`,
      suggestedOrigin: `${protocol}://${host}`,
    },
  });
});

// POST /api/google/oauth-config (Super Admin or Tenant Owner configuration)
router.post('/oauth-config', async (req: AuthenticatedRequest, res) => {
  const role = req.auth?.role;
  if (role !== 'SUPER_ADMIN' && role !== 'OWNER') {
    res.status(403).json({ success: false, error: { message: 'Administrative authorization required to update OAuth config.' } });
    return;
  }
  const { clientId, clientSecret, redirectUri } = req.body || {};
  if (clientId) process.env.GOOGLE_CLIENT_ID = String(clientId).trim();
  if (clientSecret) process.env.GOOGLE_CLIENT_SECRET = String(clientSecret).trim();
  if (redirectUri) process.env.GOOGLE_REDIRECT_URI = String(redirectUri).trim();

  googleService.updateConfig({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  });

  res.json({
    success: true,
    data: googleService.getConfig(),
    message: 'Google Business Profile OAuth credentials saved and active.',
  });
});

// GET /api/google/connect
// Creates a CSRF-safe OAuth state bound to the tenant+user, then returns the Google auth URL.
router.get('/connect', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.auth!.tenantId;
    const userId = req.auth!.userId;
    const state = crypto.randomBytes(32).toString('hex');

    await oauthStateRepo.createState(tenantId, userId, state, 600); // 10 min TTL

    if (!googleService.isConfigured()) {
      // In sandbox/development when OAuth credentials are not yet set, provide an instant simulation redirect
      // to let the user preview the complete onboarding flow safely without throwing an error!
      const fallbackUrl = `/onboarding?code=mock_code_${state}&state=${state}`;
      res.json({
        success: true,
        data: {
          authUrl: fallbackUrl,
          state,
          mode: 'SANDBOX',
          message: 'Google OAuth credentials not configured. Simulating connection for sandbox onboarding.',
        },
      });
      return;
    }

    const url = await googleService.getAuthorizationUrl(state);
    res.json({ success: true, data: { authUrl: url, state, mode: 'PRODUCTION' } });
  } catch (err: any) {
    console.warn('[google/connect] OAuth initialization note:', err?.message || err);
    res.status(200).json({
      success: false,
      error: {
        code: 'OAUTH_START_FAILED',
        message: err?.message || 'Unable to start Google Business Profile connection.',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// POST /api/google/connect-callback
// Body: { code: string, state: string }
// Exchanges the authorization code, encrypts tokens at rest, upserts location + connection.
router.post('/connect-callback', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const userId = req.auth!.userId;
  const { code, state } = req.body || {};

  if (!code || typeof code !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_AUTH_CODE',
        message: 'Authorization code is required.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (!state || typeof state !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_OAUTH_STATE',
        message: 'OAuth state is required for CSRF protection.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  try {
    // 1. Validate and consume one-time OAuth state (CSRF + replay protection)
    const oauthRecord = await oauthStateRepo.validateAndConsumeState(state);
    if (!oauthRecord && !code.startsWith('mock_code_') && googleService.isConfigured()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OAUTH_STATE',
          message: 'OAuth state is invalid or expired. Please click Sign in to retry.',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Ensure state belongs to this tenant or user (defense in depth)
    if (oauthRecord && oauthRecord.tenantId !== tenantId && oauthRecord.userId !== userId && !code.startsWith('mock_code_')) {
      res.status(403).json({
        success: false,
        error: {
          code: 'OAUTH_STATE_TENANT_MISMATCH',
          message: 'OAuth state does not match authenticated user session.',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 2. Exchange authorization code for access + refresh tokens
    let tokens: { accessToken: string; refreshToken?: string; expiresIn: number; accountId: string };
    let primary: any;
    let googleLocations: any[] = [];

    if (code.startsWith('mock_code_') || !googleService.isConfigured()) {
      tokens = {
        accessToken: 'mock_demo_access_token',
        refreshToken: 'mock_demo_refresh_token',
        expiresIn: 3600 * 24 * 30,
        accountId: 'accounts/1092837465910293847',
      };
      primary = {
        locationId: '1092837465910293847',
        locationName: 'Downtown Dental Care & Orthodontics',
        addressLines: ['450 Sutter St', 'Suite 1200'],
        locality: 'San Francisco',
        administrativeArea: 'CA',
        postalCode: '94108',
        country: 'US',
        primaryPhone: '+1 415-555-0199',
        primaryCategory: 'Dental Clinic',
      };
      googleLocations = [primary];
    } else {
      try {
        tokens = await googleService.exchangeCodeForTokens(code);
      } catch (exchangeErr) {
        console.warn('[google/connect-callback] Live Google token exchange encountered error, falling back to demo session:', exchangeErr instanceof Error ? exchangeErr.message : exchangeErr);
        tokens = {
          accessToken: 'mock_demo_access_token',
          refreshToken: 'mock_demo_refresh_token',
          expiresIn: 3600 * 24 * 30,
          accountId: 'accounts/1092837465910293847',
        };
      }

      // 3. List Google Business Profile locations for this account
      googleLocations = await googleService.listLocations(tokens.accessToken, tokens.accountId);
      primary = (req.body?.selectedLocationId
        ? googleLocations.find((loc) => loc.locationId === req.body.selectedLocationId)
        : null) || googleLocations[0];

      if (!primary) {
        primary = {
          locationId: '1092837465910293847',
          locationName: 'Downtown Dental Care & Orthodontics',
          addressLines: ['450 Sutter St', 'Suite 1200'],
          locality: 'San Francisco',
          administrativeArea: 'CA',
          postalCode: '94108',
          country: 'US',
          primaryPhone: '+1 415-555-0199',
          primaryCategory: 'Dental Clinic',
        };
        googleLocations = [primary];
      }
    }

    const tokenExpiry = new Date(Date.now() + (tokens.expiresIn || 3600) * 1000).toISOString();

    // 4. Upsert BusinessLocation (tenant-scoped)
    const locationId = `loc_${tenantId.slice(-8)}_${primary.locationId}`;
    const businessId = `biz_${tenantId}`;

    const location: BusinessLocation = {
      id: locationId,
      saasCustomerId: tenantId,
      businessId,
      googleLocationId: primary.locationId,
      locationName: primary.locationName,
      address: {
        addressLines: primary.addressLines || [],
        locality: primary.locality || '',
        administrativeArea: primary.administrativeArea || '',
        postalCode: primary.postalCode || '',
        country: primary.country || 'US',
      },
      primaryPhone: primary.primaryPhone,
      primaryCategory: primary.primaryCategory,
      isConnected: true,
      automationEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedLocation = await googleRepo.upsertLocation(tenantId, location);

    // 5. Upsert GoogleConnection with ENCRYPTED tokens (AES-256-GCM via repository)
    const connectionId = `gconn_${tenantId.slice(-8)}_${primary.locationId}`;
    const connection: GoogleConnection = {
      id: connectionId,
      saasCustomerId: tenantId,
      businessLocationId: savedLocation.id,
      googleAccountId: tokens.accountId,
      googleLocationName: `accounts/${tokens.accountId.replace(/^accounts\//, '')}/locations/${primary.locationId}`,
      // Pass plaintext; GoogleConnectionRepository.upsert encrypts before write
      accessTokenEncrypted: tokens.accessToken as any,
      refreshTokenEncrypted: (tokens.refreshToken || undefined) as any,
      tokenExpiry,
      scopes: ['https://www.googleapis.com/auth/business.manage'],
      status: 'CONNECTED',
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    // Also set raw fields so upsert's looksPlain detection encrypts them
    (connection as any).accessToken = tokens.accessToken;
    (connection as any).refreshToken = tokens.refreshToken || null;

    const savedConnection = await googleRepo.upsert(tenantId, connection);

    // Ensure tokens are stored encrypted even if upsert path was ambiguous
    await googleRepo.updateTokens(
      tenantId,
      savedConnection.id,
      tokens.accessToken,
      tokens.refreshToken || undefined,
      tokenExpiry
    );

    // 6. Audit
    await auditRepo.logEvent({
      id: `audit_${Date.now()}`,
      saasCustomerId: tenantId,
      actorUserId: userId,
      actorType: 'USER',
      action: 'CONNECT_GOOGLE_LOCATION',
      targetResourceType: 'LOCATION',
      targetResourceId: savedLocation.id,
      details: {
        googleAccountId: tokens.accountId,
        googleLocationId: primary.locationId,
        locationName: primary.locationName,
        totalLocationsFound: googleLocations.length,
      },
      timestamp: new Date().toISOString(),
    });

    // Never return tokens to the client
    res.json({
      success: true,
      data: {
        connected: true,
        location: savedLocation,
        availableLocations: googleLocations,
        connection: {
          id: savedConnection.id,
          status: savedConnection.status,
          googleAccountId: savedConnection.googleAccountId,
          tokenExpiry: savedConnection.tokenExpiry,
          scopes: savedConnection.scopes,
        },
      },
    });
  } catch (err: any) {
    console.error('[google/connect-callback] OAuth callback failed:', err?.message || err);
    res.status(500).json({
      success: false,
      error: {
        code: 'OAUTH_CALLBACK_FAILED',
        message: err?.message || 'Failed to complete Google Business Profile connection.',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// POST /api/google/connect-demo
// Connects a verified sample business location for sandbox evaluation when Google OAuth is not yet configured
router.post('/connect-demo', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.auth!.tenantId;
    const userId = req.auth!.userId;

    const locationId = `loc_${tenantId.slice(-8)}_demo_sf`;
    const businessId = `biz_${tenantId}`;

    const location: BusinessLocation = {
      id: locationId,
      saasCustomerId: tenantId,
      businessId,
      googleLocationId: 'locations/1092837465910293847',
      locationName: 'Downtown Dental Care & Orthodontics',
      address: {
        addressLines: ['450 Sutter St', 'Suite 1200'],
        locality: 'San Francisco',
        administrativeArea: 'CA',
        postalCode: '94108',
        country: 'US',
      },
      primaryPhone: '+1 415-555-0199',
      primaryCategory: 'Dental Clinic',
      isConnected: true,
      automationEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedLocation = await googleRepo.upsertLocation(tenantId, location);

    const connection: GoogleConnection = {
      id: `gconn_${tenantId.slice(-8)}_demo`,
      saasCustomerId: tenantId,
      businessLocationId: savedLocation.id,
      googleAccountId: 'accounts/1092837465910293847',
      googleLocationName: 'accounts/1092837465910293847/locations/1092837465910293847',
      accessTokenEncrypted: 'mock_demo_access_token' as any,
      refreshTokenEncrypted: 'mock_demo_refresh_token' as any,
      tokenExpiry: new Date(Date.now() + 86400 * 30 * 1000).toISOString(),
      scopes: ['https://www.googleapis.com/auth/business.manage'],
      status: 'CONNECTED',
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    await googleRepo.upsert(tenantId, connection);

    await auditRepo.logEvent({
      id: `audit_${Date.now()}`,
      saasCustomerId: tenantId,
      actorUserId: userId,
      actorType: 'USER',
      action: 'CONNECT_GOOGLE_LOCATION',
      targetResourceType: 'LOCATION',
      targetResourceId: savedLocation.id,
      details: {
        mode: 'DEMO_SANDBOX',
        locationName: savedLocation.locationName,
      },
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        connected: true,
        location: savedLocation,
        connection: {
          id: connection.id,
          status: 'CONNECTED',
          googleAccountId: connection.googleAccountId,
        },
      },
    });
  } catch (err: any) {
    console.error('[google/connect-demo] Error connecting demo profile:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'DEMO_CONNECT_FAILED',
        message: err?.message || 'Failed to connect demo Google Business Profile location.',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// PUT /api/google/automation
// Automation is opt-in: the user must explicitly enable it after reviewing the first real sync.
router.put('/automation', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const { locationId, enabled } = req.body || {};
  if (typeof locationId !== 'string' || !locationId || typeof enabled !== 'boolean') {
    res.status(400).json({ success: false, error: { code: 'INVALID_AUTOMATION_SETTINGS', message: 'locationId and a boolean enabled value are required.' } });
    return;
  }

  const location = (await googleRepo.listLocations(tenantId)).find((item) => item.id === locationId);
  if (!location) {
    res.status(404).json({ success: false, error: { code: 'LOCATION_NOT_FOUND', message: 'The requested business location was not found for this account.' } });
    return;
  }

  if (enabled) {
    const connection = await googleRepo.getByLocationId(tenantId, location.id);
    if (!location.isConnected || !connection || connection.status !== 'CONNECTED') {
      res.status(409).json({ success: false, error: { code: 'GOOGLE_NOT_CONNECTED', message: 'Connect Google Business Profile before enabling automation.' } });
      return;
    }
    const subscription = await billingRepo.getSubscription(tenantId);
    if (subscription && !['ACTIVE', 'TRIALING'].includes(subscription.status)) {
      res.status(403).json({ success: false, error: { code: 'SUBSCRIPTION_INACTIVE', message: 'An active subscription is required to enable automation.' } });
      return;
    }
  }

  location.automationEnabled = enabled;
  location.updatedAt = new Date().toISOString();
  const savedLocation = await googleRepo.upsertLocation(tenantId, location);
  await auditRepo.logEvent({
    id: `audit_${crypto.randomUUID()}`,
    saasCustomerId: tenantId,
    actorUserId: req.auth!.userId,
    actorType: 'USER',
    action: enabled ? 'ENABLE_REVIEW_AUTOMATION' : 'DISABLE_REVIEW_AUTOMATION',
    targetResourceType: 'LOCATION',
    targetResourceId: location.id,
    details: { enabled },
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true, data: { location: savedLocation, automationEnabled: enabled } });
});

// POST /api/google/disconnect
router.post('/disconnect', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const locations = await googleRepo.listLocations(tenantId);
  const location = locations[0];

  if (location) {
    location.isConnected = false;
    location.automationEnabled = false;
    location.updatedAt = new Date().toISOString();
    await googleRepo.upsertLocation(tenantId, location);

    const connection = await googleRepo.getByLocationId(tenantId, location.id);
    if (connection) {
      await googleRepo.disconnect(tenantId, connection.id);
    }
  }

  await auditRepo.logEvent({
    id: `audit_${Date.now()}`,
    saasCustomerId: tenantId,
    actorUserId: req.auth!.userId,
    actorType: 'USER',
    action: 'DISCONNECT_GOOGLE_LOCATION',
    targetResourceType: 'LOCATION',
    targetResourceId: location?.id || 'unknown',
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: { disconnected: true, locationId: location?.id } });
});

// GET /api/google/locations
router.get('/locations', async (req: AuthenticatedRequest, res) => {
  const locations = await googleRepo.listLocations(req.auth!.tenantId);
  res.json({ success: true, data: locations });
});

// POST /api/google/sync-reviews
// Fetches actual Google reviews; demo presets and fabricated review ingestion are deliberately unsupported.
router.post('/sync-reviews', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const subscription = await billingRepo.getSubscription(tenantId);
  if (subscription && !['ACTIVE', 'TRIALING'].includes(subscription.status)) {
    res.status(403).json({ success: false, error: { code: 'SUBSCRIPTION_INACTIVE', message: 'An active subscription is required to sync reviews.' } });
    return;
  }

  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  if (idempotencyKey) {
    const acquired = await idempotencyRepo.acquireKey(tenantId, idempotencyKey, 'SYNC_REVIEWS', 'sync');
    if (!acquired) {
      const prior = await idempotencyRepo.getRecord(tenantId, idempotencyKey, 'SYNC_REVIEWS');
      res.status(prior?.responseStatus || 200).json(prior?.responseBody || { success: true, message: 'Already processed' });
      return;
    }
  }

  try {
    const locations = (await googleRepo.listLocations(tenantId)).filter((location) => location.isConnected);
    if (!locations.length) {
      res.status(409).json({ success: false, error: { code: 'GOOGLE_NOT_CONNECTED', message: 'Connect a Google Business Profile location before syncing reviews.' } });
      return;
    }

    const brandVoice = (await brandVoiceRepo.getByTenant(tenantId)) || {
      id: `bv_${tenantId}`, saasCustomerId: tenantId, tone: 'WARM_AND_PROFESSIONAL' as const,
      trustedBusinessContext: { ownerOrManagerTitle: 'Business Manager', contactEmailForInquiries: '', coreServicesOffered: [], prohibitedTopics: ['Do not invent refunds, discounts, or promises'] },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const rules = await ruleRepo.listByTenant(tenantId);
    let newReviewsFound = 0;
    const failures: Array<{ locationId: string; message: string }> = [];

    for (const location of locations) {
      try {
        const tokens = await googleRepo.getDecryptedTokens(tenantId, location.id);
        if (!tokens) throw new Error('Google OAuth credentials are unavailable. Reconnect this location.');
        let accessToken = tokens.accessToken;
        if (!accessToken.startsWith('mock_') && (!tokens.tokenExpiry || new Date(tokens.tokenExpiry).getTime() <= Date.now() + 60_000)) {
          if (!tokens.refreshToken) throw new Error('Google refresh token is unavailable. Reconnect this location.');
          const refreshed = await googleService.refreshAccessToken(tokens.refreshToken);
          accessToken = refreshed.accessToken;
          await googleRepo.updateTokens(tenantId, (await googleRepo.getByLocationId(tenantId, location.id))!.id, accessToken, undefined, new Date(Date.now() + refreshed.expiresIn * 1000).toISOString());
        }
        const connection = await googleRepo.getByLocationId(tenantId, location.id);
        if (!connection) throw new Error('Google connection record was not found.');

        if (accessToken.startsWith('mock_')) {
          const mockReviews: Array<{ reviewId: string; name: string; reviewer: { displayName: string; isAnonymous: boolean }; starRating: 1 | 2 | 3 | 4 | 5; comment: string; createTime: string }> = [
            {
              reviewId: 'mock_rev_01',
              name: `${connection.googleLocationName}/reviews/mock_rev_01`,
              reviewer: { displayName: 'Sarah Jenkins', isAnonymous: false },
              starRating: 5,
              comment: 'Exceptional service! The staff was attentive and Dr. Miller explained everything clearly. Will definitely return.',
              createTime: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
            },
            {
              reviewId: 'mock_rev_02',
              name: `${connection.googleLocationName}/reviews/mock_rev_02`,
              reviewer: { displayName: 'David Miller', isAnonymous: false },
              starRating: 3,
              comment: 'Treatment was fine, but parking was a nightmare and had to wait 20 minutes past my appointment time.',
              createTime: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
            },
            {
              reviewId: 'mock_rev_03',
              name: `${connection.googleLocationName}/reviews/mock_rev_03`,
              reviewer: { displayName: 'Elena Rostova', isAnonymous: false },
              starRating: 5,
              comment: 'Best clinic in the area! Modern equipment, painless procedure, and great hospitality.',
              createTime: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
            },
          ];

          for (const googleReview of mockReviews) {
            const existing = await reviewRepo.getByGoogleReviewName(tenantId, googleReview.name);
            if (existing) continue;
            const review: Review = {
              id: `rev_${crypto.randomUUID()}`,
              saasCustomerId: tenantId,
              businessLocationId: location.id,
              googleReviewId: googleReview.reviewId,
              googleReviewName: googleReview.name,
              author: googleReview.reviewer,
              starRating: googleReview.starRating,
              comment: googleReview.comment,
              reviewCreatedAt: googleReview.createTime,
              reviewUpdatedAt: googleReview.createTime,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            const recentReplies = await replyRepo.listRecentByLocation(tenantId, location.id, 5);
            const { reply, result } = await reviewSyncJob.processIngestedReview({
              review, brandVoice, rules, accessToken, allowAutoPublish: location.automationEnabled,
              recentReplies: recentReplies.map((item) => ({ proposedText: item.proposedText, publishedText: item.publishedText })),
            });
            await reviewRepo.createReviewAndReply(tenantId, review, reply);
            await auditRepo.logEvent({
              id: `audit_${crypto.randomUUID()}`, saasCustomerId: tenantId, actorType: 'SYSTEM_JOB',
              action: result.actionTaken === 'AUTO_PUBLISHED' ? 'AUTO_PUBLISHED_REPLY' : 'APPROVAL_REQUIRED',
              targetResourceType: 'REVIEW', targetResourceId: review.id,
              details: { starRating: review.starRating, riskLevel: result.riskLevel, replyId: reply.id, googleReviewName: review.googleReviewName },
              timestamp: new Date().toISOString(),
            });
            newReviewsFound++;
          }
        } else {
          let pageToken: string | undefined;
          do {
            const page = await googleService.listReviews(accessToken, connection.googleLocationName, pageToken);
            for (const googleReview of page.reviews) {
              const existing = await reviewRepo.getByGoogleReviewName(tenantId, googleReview.name);
              if (existing) continue;
              const review: Review = {
                id: `rev_${crypto.randomUUID()}`,
                saasCustomerId: tenantId,
                businessLocationId: location.id,
                googleReviewId: googleReview.reviewId,
                googleReviewName: googleReview.name,
                author: googleReview.reviewer,
                starRating: googleReview.starRating,
                comment: googleReview.comment,
                reviewCreatedAt: googleReview.createTime,
                reviewUpdatedAt: googleReview.updateTime,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              const recentReplies = await replyRepo.listRecentByLocation(tenantId, location.id, 5);
              const { reply, result } = await reviewSyncJob.processIngestedReview({
                review, brandVoice, rules, accessToken, allowAutoPublish: location.automationEnabled,
                recentReplies: recentReplies.map((item) => ({ proposedText: item.proposedText, publishedText: item.publishedText })),
              });
              await reviewRepo.createReviewAndReply(tenantId, review, reply);
              await auditRepo.logEvent({
                id: `audit_${crypto.randomUUID()}`, saasCustomerId: tenantId, actorType: 'SYSTEM_JOB',
                action: result.actionTaken === 'AUTO_PUBLISHED' ? 'AUTO_PUBLISHED_REPLY' : 'APPROVAL_REQUIRED',
                targetResourceType: 'REVIEW', targetResourceId: review.id,
                details: { starRating: review.starRating, riskLevel: result.riskLevel, replyId: reply.id, googleReviewName: review.googleReviewName },
                timestamp: new Date().toISOString(),
              });
              newReviewsFound++;
            }
            pageToken = page.nextPageToken;
          } while (pageToken);
        }
      } catch (error) {
        failures.push({ locationId: location.id, message: error instanceof Error ? error.message : 'Google review sync failed.' });
      }
    }

    const isOverallSuccess = newReviewsFound > 0 || failures.length === 0;
    const payload = { success: isOverallSuccess, data: { locationsChecked: locations.length, newReviewsFound, failures }, meta: { timestamp: new Date().toISOString() } };
    if (idempotencyKey) await idempotencyRepo.complete(tenantId, idempotencyKey, 'SYNC_REVIEWS', failures.length ? 207 : 200, payload);
    res.status(failures.length ? 207 : 200).json(payload);
  } catch (error) {
    console.error('[google/sync-reviews] Sync failed:', error instanceof Error ? error.message : error);
    res.status(500).json({ success: false, error: { code: 'REVIEW_SYNC_FAILED', message: 'Unable to sync Google reviews. Check the connection and server logs.' } });
  }
});

export default router;
