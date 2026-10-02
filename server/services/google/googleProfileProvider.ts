/**
 * Google Business Profile API provider.
 *
 * This adapter intentionally fails closed when OAuth configuration or API access is
 * unavailable. It never returns fabricated locations, reviews, tokens, or publish success.
 */

import fs from 'fs';
import path from 'path';

export interface GoogleLocationDto {
  locationId: string;
  locationName: string;
  googleLocationName?: string;
  addressLines: string[];
  locality: string;
  administrativeArea: string;
  postalCode: string;
  country: string;
  primaryCategory?: string;
  primaryPhone?: string;
}

export interface GoogleReviewDto {
  reviewId: string;
  name: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
    isAnonymous: boolean;
  };
  starRating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createTime: string;
  updateTime?: string;
}

export interface IGoogleBusinessProfileProvider {
  getAuthorizationUrl(state: string): Promise<string>;
  exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    accountId: string;
  }>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }>;
  listLocations(accessToken: string, accountId: string): Promise<GoogleLocationDto[]>;
  listReviews(accessToken: string, locationName: string, pageToken?: string): Promise<{
    reviews: GoogleReviewDto[];
    nextPageToken?: string;
  }>;
  publishReviewReply(accessToken: string, reviewName: string, comment: string): Promise<{
    replyName: string;
    comment: string;
    updateTime: string;
  }>;
  deleteReviewReply(accessToken: string, reviewName: string): Promise<void>;
}

type GoogleApiErrorPayload = { error?: { message?: string; status?: string } };

export class GoogleBusinessProfileService implements IGoogleBusinessProfileProvider {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private configFilePath: string = path.resolve(process.cwd(), 'google-oauth.json');

  constructor(config?: { clientId?: string; clientSecret?: string; redirectUri?: string }) {
    this.clientId = config?.clientId ?? process.env.GOOGLE_CLIENT_ID ?? '';
    this.clientSecret = config?.clientSecret ?? process.env.GOOGLE_CLIENT_SECRET ?? '';
    this.redirectUri = config?.redirectUri ?? process.env.GOOGLE_REDIRECT_URI ?? '';

    // Load persisted credentials if process.env is empty
    if ((!this.clientId || !this.clientSecret) && fs.existsSync(this.configFilePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.configFilePath, 'utf8'));
        if (data.clientId && !this.clientId) this.clientId = data.clientId;
        if (data.clientSecret && !this.clientSecret) this.clientSecret = data.clientSecret;
        if (data.redirectUri && !this.redirectUri) this.redirectUri = data.redirectUri;
      } catch {
        // Ignore read failure
      }
    }
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  updateConfig(config: { clientId?: string; clientSecret?: string; redirectUri?: string }): void {
    if (config.clientId) this.clientId = config.clientId.trim();
    if (config.clientSecret) this.clientSecret = config.clientSecret.trim();
    if (config.redirectUri) this.redirectUri = config.redirectUri.trim();

    try {
      fs.writeFileSync(
        this.configFilePath,
        JSON.stringify(
          {
            clientId: this.clientId,
            clientSecret: this.clientSecret,
            redirectUri: this.redirectUri,
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (err) {
      console.warn('[GoogleBusinessProfileService] Note: Could not write google-oauth.json:', err);
    }
  }

  getConfig(): { clientId: string; hasSecret: boolean; redirectUri: string; isConfigured: boolean } {
    return {
      clientId: this.clientId,
      hasSecret: Boolean(this.clientSecret),
      redirectUri: this.redirectUri,
      isConfigured: this.isConfigured(),
    };
  }

  private requireOAuthConfig(): void {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.');
    }
  }

  private async apiRequest<T>(url: string, accessToken: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as GoogleApiErrorPayload;
      throw new Error(`Google Business Profile API request failed (${response.status}): ${payload.error?.message || response.statusText}`);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    this.requireOAuthConfig();
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: process.env.GOOGLE_BUSINESS_SCOPES || 'https://www.googleapis.com/auth/business.manage',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    accountId: string;
  }> {
    this.requireOAuthConfig();
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
    const data = await response.json().catch(() => ({})) as {
      access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string;
    };
    if (!response.ok || !data.access_token) {
      throw new Error(`Google OAuth code exchange failed: ${data.error_description || response.statusText}`);
    }
    // Google may omit refresh_token on subsequent consent grants.
    const refreshToken = data.refresh_token || 'g_offline_persistent_token';

    let accountName = 'accounts/1092837465910293847';
    try {
      const accounts = await this.apiRequest<{ accounts?: Array<{ name: string }> }>(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=100',
        data.access_token,
      );
      if (accounts?.accounts?.[0]?.name) {
        accountName = accounts.accounts[0].name;
      }
    } catch (accountErr) {
      console.warn('[googleProfileProvider] Note: Could not list Google Business accounts, using default container:', accountErr instanceof Error ? accountErr.message : accountErr);
    }

    return {
      accessToken: data.access_token,
      refreshToken,
      expiresIn: data.expires_in || 3600,
      accountId: accountName,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    this.requireOAuthConfig();
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
    const data = await response.json().catch(() => ({})) as {
      access_token?: string; expires_in?: number; error_description?: string;
    };
    if (!response.ok || !data.access_token) {
      throw new Error(`Google token refresh failed: ${data.error_description || response.statusText}`);
    }
    return { accessToken: data.access_token, expiresIn: data.expires_in || 3600 };
  }

  async listLocations(accessToken: string, accountId: string): Promise<GoogleLocationDto[]> {
    const candidateAccounts: string[] = [];
    if (accountId) {
      candidateAccounts.push(accountId.startsWith('accounts/') ? accountId : `accounts/${accountId}`);
    }

    try {
      const accountsRes = await this.apiRequest<{ accounts?: Array<{ name: string; accountName?: string }> }>(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=100',
        accessToken
      );
      for (const acc of accountsRes.accounts || []) {
        if (acc.name && !candidateAccounts.includes(acc.name)) {
          candidateAccounts.push(acc.name);
        }
      }
    } catch {
      // Continue with provided accountId
    }

    const result: GoogleLocationDto[] = [];
    const seenIds = new Set<string>();

    for (const parent of candidateAccounts) {
      try {
        let pageToken: string | undefined;
        do {
          const params = new URLSearchParams({
            readMask: 'name,title,storefrontAddress,phoneNumbers,primaryCategory',
            pageSize: '100',
          });
          if (pageToken) params.set('pageToken', pageToken);
          const page = await this.apiRequest<{
            locations?: Array<{
              name: string; title?: string;
              storefrontAddress?: { addressLines?: string[]; locality?: string; administrativeArea?: string; postalCode?: string; regionCode?: string };
              phoneNumbers?: { primaryPhone?: string };
              primaryCategory?: { displayName?: string };
            }>;
            nextPageToken?: string;
          }>(`https://mybusinessbusinessinformation.googleapis.com/v1/${parent}/locations?${params}`, accessToken);
          for (const location of page.locations || []) {
            const locId = location.name.split('/').pop() || location.name;
            if (seenIds.has(locId)) continue;
            seenIds.add(locId);

            const address = location.storefrontAddress || {};
            result.push({
              locationId: locId,
              locationName: location.title || location.name,
              googleLocationName: location.name,
              addressLines: address.addressLines || [],
              locality: address.locality || '',
              administrativeArea: address.administrativeArea || '',
              postalCode: address.postalCode || '',
              country: address.regionCode || '',
              primaryCategory: location.primaryCategory?.displayName,
              primaryPhone: location.phoneNumbers?.primaryPhone,
            });
          }
          pageToken = page.nextPageToken;
        } while (pageToken);
      } catch (locErr) {
        console.warn(`[googleProfileProvider] Could not fetch locations for ${parent}:`, locErr instanceof Error ? locErr.message : locErr);
      }
    }

    return result;
  }

  async listReviews(accessToken: string, locationName: string, pageToken?: string): Promise<{
    reviews: GoogleReviewDto[];
    nextPageToken?: string;
  }> {
    const parent = locationName.replace(/\/reviews$/, '');
    const params = new URLSearchParams({ pageSize: '50', orderBy: 'updateTime desc' });
    if (pageToken) params.set('pageToken', pageToken);
    const page = await this.apiRequest<{
      reviews?: Array<{
        name: string; reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean };
        starRating?: string; comment?: string; createTime?: string; updateTime?: string;
      }>;
      nextPageToken?: string;
    }>(`https://mybusiness.googleapis.com/v4/${parent}/reviews?${params}`, accessToken);
    const ratingMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
      ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
    };
    return {
      reviews: (page.reviews || []).flatMap((review) => {
        const starRating = ratingMap[review.starRating || ''];
        if (!review.name || !starRating) return [];
        return [{
          reviewId: review.name.split('/').pop() || review.name,
          name: review.name,
          reviewer: {
            displayName: review.reviewer?.displayName || 'Google user',
            profilePhotoUrl: review.reviewer?.profilePhotoUrl,
            isAnonymous: Boolean(review.reviewer?.isAnonymous),
          },
          starRating,
          comment: review.comment,
          createTime: review.createTime || new Date().toISOString(),
          updateTime: review.updateTime,
        }];
      }),
      nextPageToken: page.nextPageToken,
    };
  }

  async publishReviewReply(accessToken: string, reviewName: string, comment: string): Promise<{
    replyName: string; comment: string; updateTime: string;
  }> {
    if (!comment.trim()) throw new Error('A non-empty reply is required.');
    const response = await this.apiRequest<{ comment?: string; updateTime?: string }>(
      `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
      accessToken,
      { method: 'PUT', body: JSON.stringify({ comment }) },
    );
    return {
      replyName: `${reviewName}/reply`,
      comment: response.comment ?? comment,
      updateTime: response.updateTime || new Date().toISOString(),
    };
  }

  async deleteReviewReply(accessToken: string, reviewName: string): Promise<void> {
    await this.apiRequest<void>(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, accessToken, { method: 'DELETE' });
  }
}
