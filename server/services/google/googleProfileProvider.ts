/**
 * Google Business Profile API Provider Service
 *
 * Implements IGoogleBusinessProfileService and IGoogleBusinessProfileProvider.
 * Automatically delegates to MockGoogleBusinessProfileService when production credentials
 * (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are absent, allowing seamless development and testing.
 */

import type {
  IGoogleBusinessProfileService,
  GoogleAccountDto,
  GoogleLocationDto,
  GoogleReviewDto,
  GoogleReplyDto,
  GoogleTokens,
  ConnectionHealthStatus,
} from './types';
import { IGoogleBusinessProfileProvider } from './types';
import { GoogleProviderError, normalizeGoogleError } from './googleErrors';
import {
  OAuthStateManager,
  googleTokenStore,
  sanitizeForLogging,
} from './googleTokenStore';
import { MockGoogleBusinessProfileService } from './mockGoogleProvider';

export interface GoogleServiceConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  forceMock?: boolean;
}

export class GoogleBusinessProfileService
  implements IGoogleBusinessProfileService, IGoogleBusinessProfileProvider
{
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private mockProvider: MockGoogleBusinessProfileService;
  private isMockMode: boolean;

  constructor(config?: GoogleServiceConfig) {
    this.clientId = config?.clientId || process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = config?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri =
      config?.redirectUri ||
      process.env.GOOGLE_REDIRECT_URI ||
      'http://localhost:3000/api/google/callback';

    this.mockProvider = new MockGoogleBusinessProfileService(true);
    // Use mock mode if explicitly requested or if credentials are missing/placeholder
    const isPlaceholderCredentials =
      !this.clientId ||
      !this.clientSecret ||
      this.clientSecret === 'MY_GOOGLE_CLIENT_SECRET' ||
      this.clientSecret.includes('your-google') ||
      this.clientSecret.includes('placeholder') ||
      this.clientId.includes('your-google') ||
      process.env.GOOGLE_MOCK_MODE === 'true';

    this.isMockMode = config?.forceMock ?? isPlaceholderCredentials;
  }

  public getMockProvider(): MockGoogleBusinessProfileService {
    return this.mockProvider;
  }

  public isInMockMode(): boolean {
    return this.isMockMode;
  }

  public setMockMode(enabled: boolean): void {
    this.isMockMode = enabled;
  }

  /**
   * Helper: Execute an HTTP request to Google API with automatic retry on 429/transient errors
   * and automatic token refresh on 401.
   */
  private async fetchWithRetry(
    saasCustomerId: string,
    url: string,
    options: RequestInit = {},
    maxRetries = 2
  ): Promise<Response> {
    let attempt = 0;
    let delay = 1000;

    while (attempt <= maxRetries) {
      try {
        // Resolve latest valid access token
        let tokenInfo = googleTokenStore.getDecryptedAccessToken(saasCustomerId);
        if (!tokenInfo || tokenInfo.isExpired) {
          // Attempt refresh
          await this.refreshTokenForCustomer(saasCustomerId);
          tokenInfo = googleTokenStore.getDecryptedAccessToken(saasCustomerId);
        }

        const headers = new Headers(options.headers || {});
        if (tokenInfo?.accessToken) {
          headers.set('Authorization', `Bearer ${tokenInfo.accessToken}`);
        }

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 && attempt < maxRetries) {
          // Token expired mid-session: refresh and retry
          await this.refreshTokenForCustomer(saasCustomerId);
          attempt++;
          continue;
        }

        if (response.status === 429 || response.status >= 500) {
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, delay));
            delay *= 2;
            attempt++;
            continue;
          }
        }

        return response;
      } catch (err) {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          attempt++;
          continue;
        }
        throw normalizeGoogleError(err);
      }
    }

    throw new GoogleProviderError({
      message: 'Exceeded maximum retries communicating with Google API.',
      code: 'NETWORK_ERROR',
      statusCode: 503,
      retryable: true,
    });
  }

  private async refreshTokenForCustomer(saasCustomerId: string): Promise<string> {
    const refreshToken = googleTokenStore.getDecryptedRefreshToken(saasCustomerId);
    if (!refreshToken) {
      throw new GoogleProviderError({
        message: 'No refresh token available to renew expired Google session.',
        code: 'TOKEN_EXPIRED',
        statusCode: 401,
        retryable: false,
      });
    }

    const { accessToken, expiresIn } = await this.refreshAccessToken(refreshToken);

    googleTokenStore.saveTokens({
      saasCustomerId,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn,
        receivedAt: Date.now(),
      },
    });

    return accessToken;
  }

  // ==========================================
  // IGoogleBusinessProfileService Methods
  // ==========================================

  async connect(params: {
    saasCustomerId: string;
    redirectUri?: string;
    stateMetadata?: Record<string, string>;
  }): Promise<{ authUrl: string; state: string }> {
    if (this.isMockMode) {
      return this.mockProvider.connect(params);
    }

    const state = OAuthStateManager.generateState(params.saasCustomerId, params.stateMetadata);
    const redirect = params.redirectUri || this.redirectUri;

    const query = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirect,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/business.manage',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`,
      state,
    };
  }

  async handleCallback(params: {
    code: string;
    state: string;
    saasCustomerId: string;
  }): Promise<{ tokens: GoogleTokens; accountId: string }> {
    // Validate anti-CSRF state token
    OAuthStateManager.validateState(params.state, params.saasCustomerId);

    if (this.isMockMode) {
      return this.mockProvider.handleCallback(params);
    }

    const tokenData = await this.exchangeCodeForTokens(params.code);

    const tokens: GoogleTokens = {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresIn: tokenData.expiresIn,
      tokenType: 'Bearer',
      scope: 'https://www.googleapis.com/auth/business.manage',
      receivedAt: Date.now(),
    };

    googleTokenStore.saveTokens({
      saasCustomerId: params.saasCustomerId,
      tokens,
      googleAccountId: tokenData.accountId,
    });

    return {
      tokens,
      accountId: tokenData.accountId,
    };
  }

  async listAccounts(saasCustomerId: string): Promise<GoogleAccountDto[]> {
    if (this.isMockMode) {
      return this.mockProvider.listAccounts(saasCustomerId);
    }

    const response = await this.fetchWithRetry(
      saasCustomerId,
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts'
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error(
        '[Google Service] Failed to list accounts:',
        sanitizeForLogging({ status: response.status, body: errBody })
      );
      throw normalizeGoogleError(new Error(`Google API error HTTP ${response.status}: ${errBody}`));
    }

    const data = await response.json();
    return (data.accounts || []).map((acc: any) => ({
      accountId: acc.name,
      accountName: acc.accountName || acc.name,
      type: acc.type || 'PERSONAL',
      role: acc.role,
      verificationState: acc.verificationState,
    }));
  }

  async listLocations(saasCustomerId: string, accountId: string): Promise<GoogleLocationDto[]> {
    if (this.isMockMode) {
      return this.mockProvider.listLocations(saasCustomerId, accountId);
    }

    const parent = accountId.startsWith('accounts/') ? accountId : `accounts/${accountId}`;
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${parent}/locations?readMask=name,title,storefrontAddress,primaryPhone,websiteUri,metadata`;

    const response = await this.fetchWithRetry(saasCustomerId, url);
    if (!response.ok) {
      const errBody = await response.text();
      throw normalizeGoogleError(new Error(`Failed to list locations: ${errBody}`));
    }

    const data = await response.json();
    return (data.locations || []).map((loc: any) => ({
      locationId: loc.name,
      locationName: loc.title || 'Untitled Location',
      addressLines: loc.storefrontAddress?.addressLines || [],
      locality: loc.storefrontAddress?.locality || '',
      administrativeArea: loc.storefrontAddress?.administrativeArea || '',
      postalCode: loc.storefrontAddress?.postalCode || '',
      country: loc.storefrontAddress?.regionCode || 'US',
      primaryPhone: loc.primaryPhone,
      websiteUri: loc.websiteUri,
      googlePlaceId: loc.metadata?.placeId,
    }));
  }

  async listReviews(
    saasCustomerId: string,
    locationName: string,
    pageToken?: string,
    pageSize = 20
  ): Promise<{
    reviews: GoogleReviewDto[];
    nextPageToken?: string;
    totalReviewCount?: number;
  }> {
    if (this.isMockMode) {
      return this.mockProvider.listReviews(saasCustomerId, locationName, pageToken, pageSize);
    }

    const query = new URLSearchParams({
      pageSize: String(pageSize),
    });
    if (pageToken) query.set('pageToken', pageToken);

    const url = `https://mybusiness.googleapis.com/v4/${locationName}/reviews?${query.toString()}`;
    const response = await this.fetchWithRetry(saasCustomerId, url);

    if (!response.ok) {
      const errBody = await response.text();
      throw normalizeGoogleError(new Error(`Failed to list reviews: ${errBody}`));
    }

    const data = await response.json();
    const reviews: GoogleReviewDto[] = (data.reviews || []).map((r: any) => ({
      reviewId: r.reviewId || r.name.split('/').pop(),
      name: r.name,
      reviewer: {
        displayName: r.reviewer?.displayName || 'Anonymous Reviewer',
        profilePhotoUrl: r.reviewer?.profilePhotoUrl,
        isAnonymous: r.reviewer?.isAnonymous ?? !r.reviewer?.displayName,
      },
      starRating: this.parseStarRating(r.starRating),
      comment: r.comment || '',
      createTime: r.createTime,
      updateTime: r.updateTime,
      reviewReply: r.reviewReply
        ? {
            comment: r.reviewReply.comment,
            updateTime: r.reviewReply.updateTime,
          }
        : undefined,
    }));

    return {
      reviews,
      nextPageToken: data.nextPageToken,
      totalReviewCount: data.totalReviewCount,
    };
  }

  async publishReply(
    saasCustomerId: string,
    reviewName: string,
    comment: string
  ): Promise<GoogleReplyDto> {
    if (this.isMockMode) {
      return this.mockProvider.publishReply(saasCustomerId, reviewName, comment);
    }

    const url = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`;
    const response = await this.fetchWithRetry(saasCustomerId, url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw normalizeGoogleError(new Error(`Failed to publish reply: ${errBody}`));
    }

    const data = await response.json();
    return {
      replyName: `${reviewName}/reply`,
      comment: data.comment || comment,
      updateTime: data.updateTime || new Date().toISOString(),
    };
  }

  async updateReply(
    saasCustomerId: string,
    reviewName: string,
    comment: string
  ): Promise<GoogleReplyDto> {
    return this.publishReply(saasCustomerId, reviewName, comment);
  }

  async deleteReply(saasCustomerId: string, reviewName: string): Promise<void> {
    if (this.isMockMode) {
      return this.mockProvider.deleteReply(saasCustomerId, reviewName);
    }

    const url = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`;
    const response = await this.fetchWithRetry(saasCustomerId, url, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 404) {
      const errBody = await response.text();
      throw normalizeGoogleError(new Error(`Failed to delete reply: ${errBody}`));
    }
  }

  async healthCheck(saasCustomerId: string): Promise<ConnectionHealthStatus> {
    if (this.isMockMode) {
      return this.mockProvider.healthCheck(saasCustomerId);
    }

    const cred = googleTokenStore.getCredentials(saasCustomerId);
    if (!cred) {
      return {
        status: 'DISCONNECTED',
        lastCheckedAt: new Date().toISOString(),
        message: 'No Google Business Profile credentials stored for tenant.',
        scopes: [],
        hasRefreshToken: false,
        mode: 'LIVE',
      };
    }

    try {
      // Test connectivity by making a lightweight accounts call
      await this.listAccounts(saasCustomerId);
      return {
        status: 'HEALTHY',
        lastCheckedAt: new Date().toISOString(),
        message: 'Live Google Business Profile connection is active and valid.',
        scopes: cred.scopes,
        hasRefreshToken: !!cred.encryptedRefreshToken,
        expiresAt: new Date(cred.expiresAt).toISOString(),
        mode: 'LIVE',
      };
    } catch (err) {
      const normalized = normalizeGoogleError(err);
      const status =
        normalized.code === 'TOKEN_EXPIRED'
          ? 'EXPIRED'
          : normalized.code === 'PERMISSION_REVOKED'
          ? 'REVOKED'
          : 'DEGRADED';

      return {
        status,
        lastCheckedAt: new Date().toISOString(),
        message: normalized.message,
        scopes: cred.scopes,
        hasRefreshToken: !!cred.encryptedRefreshToken,
        mode: 'LIVE',
      };
    }
  }

  async disconnect(saasCustomerId: string): Promise<void> {
    if (this.isMockMode) {
      return this.mockProvider.disconnect(saasCustomerId);
    }

    const tokenInfo = googleTokenStore.getDecryptedAccessToken(saasCustomerId);
    if (tokenInfo?.accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenInfo.accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch (err) {
        console.warn(
          '[Google Service] Non-critical error revoking token with Google:',
          sanitizeForLogging(err)
        );
      }
    }

    googleTokenStore.removeCredentials(saasCustomerId);
  }

  // ==========================================
  // IGoogleBusinessProfileProvider (Backward-Compatible Low-Level Methods)
  // ==========================================

  async getAuthorizationUrl(state: string): Promise<string> {
    const res = await this.connect({ saasCustomerId: 'saas_cust_demo_01' });
    return res.authUrl;
  }

  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    accountId: string;
  }> {
    if (this.isMockMode) {
      const res = await this.mockProvider.handleCallback({
        code,
        state: OAuthStateManager.generateState('saas_cust_demo_01'),
        saasCustomerId: 'saas_cust_demo_01',
      });
      return {
        accessToken: res.tokens.accessToken,
        refreshToken: res.tokens.refreshToken || 'mock_refresh_token',
        expiresIn: res.tokens.expiresIn,
        accountId: res.accountId,
      };
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new GoogleProviderError({
        message: `Google OAuth code exchange failed with HTTP ${response.status}: ${errBody}`,
        code: 'OAUTH_FAILED',
        statusCode: response.status,
      });
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      accountId: 'accounts/google-account',
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    if (this.isMockMode) {
      return {
        accessToken: `ya29.mock_refreshed_${Date.now()}`,
        expiresIn: 3600,
      };
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new GoogleProviderError({
        message: `Google token refresh failed with HTTP ${response.status}: ${errBody}`,
        code: 'TOKEN_EXPIRED',
        statusCode: response.status,
      });
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  async publishReviewReply(
    accessTokenOrCustomerId: string,
    reviewName: string,
    comment: string
  ): Promise<{ replyName: string; comment: string; updateTime: string }> {
    // If accessTokenOrCustomerId looks like a customer ID or mock
    const customerId = accessTokenOrCustomerId.startsWith('saas_cust')
      ? accessTokenOrCustomerId
      : 'saas_cust_demo_01';
    return this.publishReply(customerId, reviewName, comment);
  }

  async deleteReviewReply(
    accessTokenOrCustomerId: string,
    reviewName: string
  ): Promise<void> {
    const customerId = accessTokenOrCustomerId.startsWith('saas_cust')
      ? accessTokenOrCustomerId
      : 'saas_cust_demo_01';
    return this.deleteReply(customerId, reviewName);
  }

  private parseStarRating(rating: any): 1 | 2 | 3 | 4 | 5 {
    if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
      return rating as 1 | 2 | 3 | 4 | 5;
    }
    switch (rating) {
      case 'FIVE':
        return 5;
      case 'FOUR':
        return 4;
      case 'THREE':
        return 3;
      case 'TWO':
        return 2;
      case 'ONE':
      default:
        return 1;
    }
  }
}
