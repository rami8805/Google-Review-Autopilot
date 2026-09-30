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
    // In production, posts to https://oauth2.googleapis.com/token
    if (!this.clientSecret) {
      // Mock development fallback
      return {
        accessToken: `ya29.mock_access_token_${Date.now()}`,
        refreshToken: `1//mock_refresh_token_${Date.now()}`,
        expiresIn: 3600,
        accountId: 'accounts/mock-google-account-123',
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
      throw new Error(`Google OAuth code exchange failed with HTTP ${response.status}`);
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
    if (!this.clientSecret) {
      return { accessToken: `ya29.mock_refreshed_${Date.now()}`, expiresIn: 3600 };
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
      throw new Error(`Google token refresh failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  async listLocations(_accessToken: string, _accountId: string): Promise<GoogleLocationDto[]> {
    return [
      {
        locationId: 'loc_98231',
        locationName: 'Downtown Dental Practice',
        addressLines: ['104 Market Street', 'Suite 200'],
        locality: 'San Francisco',
        administrativeArea: 'CA',
        postalCode: '94103',
        country: 'US',
        primaryCategory: 'Dentist',
        primaryPhone: '+1-415-555-0199',
      },
    ];
  }

  async listReviews(
    _accessToken: string,
    _locationName: string,
    _pageToken?: string
  ): Promise<{ reviews: GoogleReviewDto[]; nextPageToken?: string }> {
    return {
      reviews: [],
    };
  }

  async publishReviewReply(
    _accessToken: string,
    reviewName: string,
    comment: string
  ): Promise<{ replyName: string; comment: string; updateTime: string }> {
    return {
      replyName: `${reviewName}/reply`,
      comment,
      updateTime: new Date().toISOString(),
    };
  }

  async deleteReviewReply(_accessToken: string, _reviewName: string): Promise<void> {
    return;
  }
}
