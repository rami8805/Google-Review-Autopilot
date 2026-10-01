/**
 * Google Business Profile API provider.
 *
 * This adapter intentionally fails closed when OAuth configuration or API access is
 * unavailable. It never returns fabricated locations, reviews, tokens, or publish success.
 */

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

  constructor(config?: { clientId?: string; clientSecret?: string; redirectUri?: string }) {
    this.clientId = config?.clientId ?? process.env.GOOGLE_CLIENT_ID ?? '';
    this.clientSecret = config?.clientSecret ?? process.env.GOOGLE_CLIENT_SECRET ?? '';
    this.redirectUri = config?.redirectUri ?? process.env.GOOGLE_REDIRECT_URI ?? '';
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
    // Google may omit refresh_token on subsequent consent grants. The caller must preserve
    // an existing refresh token if one exists; a first connection requires one for background sync.
    if (!data.refresh_token) {
      throw new Error('Google did not return a refresh token. Revoke the existing app grant and reconnect with offline access.');
    }
    const accounts = await this.apiRequest<{ accounts?: Array<{ name: string }> }>(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=100',
      data.access_token,
    );
    const accountName = accounts.accounts?.[0]?.name;
    if (!accountName) throw new Error('No Google Business Profile account is accessible to the authorized user.');
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
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
    const parent = accountId.startsWith('accounts/') ? accountId : `accounts/${accountId}`;
    const result: GoogleLocationDto[] = [];
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
        const address = location.storefrontAddress || {};
        result.push({
          locationId: location.name.split('/').pop() || location.name,
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
