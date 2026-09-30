/**
 * Google Business Profile API Provider Interface and Service Adapter
 */

export interface GoogleLocationDto {
  locationId: string;
  locationName: string;
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
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }>;
  listLocations(accessToken: string, accountId: string): Promise<GoogleLocationDto[]>;
  listReviews(
    accessToken: string,
    locationName: string,
    pageToken?: string
  ): Promise<{
    reviews: GoogleReviewDto[];
    nextPageToken?: string;
  }>;
  publishReviewReply(
    accessToken: string,
    reviewName: string,
    comment: string
  ): Promise<{
    replyName: string;
    comment: string;
    updateTime: string;
  }>;
  deleteReviewReply(accessToken: string, reviewName: string): Promise<void>;
}

export class GoogleBusinessProfileService implements IGoogleBusinessProfileProvider {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(config?: { clientId?: string; clientSecret?: string; redirectUri?: string }) {
    this.clientId = config?.clientId || process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = config?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = config?.redirectUri || process.env.GOOGLE_REDIRECT_URI || '';
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/business.manage',
      access_type: 'offline',
      prompt: 'consent',
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
    if (!this.clientSecret || !this.clientId || !this.redirectUri) {
      throw new Error('Google OAuth configuration is incomplete');
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
      throw new Error(`Google OAuth code exchange failed with HTTP ${response.status}`);
    }

    const data = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!data.access_token || !data.refresh_token) throw new Error('Google OAuth response did not include required tokens');

    const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (!accountsResponse.ok) throw new Error(`Google account listing failed with HTTP ${accountsResponse.status}`);
    const accountsData = await accountsResponse.json() as { accounts?: Array<{ name?: string }> };
    const accountId = accountsData.accounts?.[0]?.name;
    if (!accountId) throw new Error('No Google Business Profile account is available for this user');

    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in || 3600, accountId };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    if (!this.clientSecret || !this.clientId) throw new Error('Google OAuth configuration is incomplete');

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
      throw new Error(`Google token refresh failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  async listLocations(accessToken: string, accountId: string): Promise<GoogleLocationDto[]> {
    if (!accessToken || !accountId) throw new Error('Google access token and account ID are required');

    const response = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress,phoneNumbers,primaryCategory`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error(`Google locations request failed with HTTP ${response.status}`);

    const data = await response.json() as { locations?: any[] };
    return (data.locations || []).map((location) => ({
      locationId: String(location.name || '').split('/').pop() || '',
      locationName: location.title || '',
      addressLines: location.storefrontAddress?.addressLines || [],
      locality: location.storefrontAddress?.locality || '',
      administrativeArea: location.storefrontAddress?.administrativeArea || '',
      postalCode: location.storefrontAddress?.postalCode || '',
      country: location.storefrontAddress?.regionCode || '',
      primaryCategory: location.primaryCategory?.displayName,
      primaryPhone: location.phoneNumbers?.primaryPhone,
    }));
  }

  async listReviews(
    accessToken: string,
    locationName: string,
    pageToken?: string
  ): Promise<{ reviews: GoogleReviewDto[]; nextPageToken?: string }> {
    if (!accessToken || !locationName) throw new Error('Google access token and location name are required');
    const url = new URL(`https://mybusiness.googleapis.com/v4/${locationName}/reviews`);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Google reviews request failed with HTTP ${response.status}`);
    const data = await response.json() as { reviews?: any[]; nextPageToken?: string };
    return {
      reviews: (data.reviews || []).map((review) => ({
        reviewId: String(review.name || '').split('/').pop() || '',
        name: review.name,
        reviewer: {
          displayName: review.reviewer?.displayName || 'Google Reviewer',
          profilePhotoUrl: review.reviewer?.profilePhotoUrl,
          isAnonymous: Boolean(review.reviewer?.isAnonymous),
        },
        starRating: ({ ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as Record<string, 1|2|3|4|5>)[review.starRating] || 5,
        comment: review.comment,
        createTime: review.createTime,
        updateTime: review.updateTime,
      })),
      nextPageToken: data.nextPageToken,
    };
  }

  async publishReviewReply(
    accessToken: string,
    reviewName: string,
    comment: string
  ): Promise<{ replyName: string; comment: string; updateTime: string }> {
    if (!accessToken || !reviewName) throw new Error('Google access token and review name are required');
    const response = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    if (!response.ok) throw new Error(`Google reply publication failed with HTTP ${response.status}`);
    const data = await response.json() as any;
    return {
      replyName: data.name || `${reviewName}/reply`,
      comment: data.comment || comment,
      updateTime: data.updateTime || new Date().toISOString(),
    };
  }

  async deleteReviewReply(accessToken: string, reviewName: string): Promise<void> {
    if (!accessToken || !reviewName) throw new Error('Google access token and review name are required');
    const response = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Google reply deletion failed with HTTP ${response.status}`);
    }
  }
}
