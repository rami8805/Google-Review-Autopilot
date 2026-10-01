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
      response_mode: 'form_post',
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
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('Google OAuth is not configured');
    }
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: this.clientId, client_secret: this.clientSecret, redirect_uri: this.redirectUri, grant_type: 'authorization_code' }),
    });
    const data = (await response.json()) as any;
    if (!response.ok || !data.access_token) throw new Error(data?.error_description || `Google OAuth code exchange failed with HTTP ${response.status}`);

    const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=100', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const accountsData = (await accountsResponse.json()) as any;
    if (!accountsResponse.ok) throw new Error(accountsData?.error?.message || `Google account listing failed with HTTP ${accountsResponse.status}`);
    const accountId = accountsData?.accounts?.[0]?.name;
    if (!accountId) throw new Error('No Google Business Profile account is available for this user');

    return { accessToken: data.access_token, refreshToken: data.refresh_token || '', expiresIn: Number(data.expires_in || 3600), accountId };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    if (!this.clientId || !this.clientSecret || !refreshToken) throw new Error('Google OAuth refresh is not configured');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: this.clientId, client_secret: this.clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    const data = (await response.json()) as any;
    if (!response.ok || !data.access_token) throw new Error(data?.error_description || `Google token refresh failed with HTTP ${response.status}`);
    return { accessToken: data.access_token, expiresIn: Number(data.expires_in || 3600) };
  }

  async listLocations(accessToken: string, accountId: string): Promise<GoogleLocationDto[]> {
    if (!accessToken || !accountId) throw new Error('Google access token and account id are required');
    const parent = accountId.startsWith('accounts/') ? accountId : `accounts/${accountId}`;
    const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${parent}/locations`);
    url.searchParams.set('readMask', 'name,title,storefrontAddress,phoneNumbers,primaryCategory');
    url.searchParams.set('pageSize', '100');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = (await response.json()) as any;
    if (!response.ok) throw new Error(data?.error?.message || `Google locations request failed with HTTP ${response.status}`);
    return (data.locations || []).map((location: any) => {
      const address = location.storefrontAddress || {};
      return {
        locationId: String(location.name || '').split('/').pop() || '',
        locationName: location.title || location.name || '',
        addressLines: address.addressLines || [],
        locality: address.locality || '',
        administrativeArea: address.administrativeArea || '',
        postalCode: address.postalCode || '',
        country: address.regionCode || '',
        primaryCategory: location.primaryCategory?.displayName,
        primaryPhone: location.phoneNumbers?.primaryPhone,
      };
    }).filter((location: GoogleLocationDto) => location.locationId);
  }

  async listReviews(accessToken: string, locationName: string, pageToken?: string): Promise<{ reviews: GoogleReviewDto[]; nextPageToken?: string }> {
    if (!accessToken || !locationName) throw new Error('Google access token and location name are required');
    const url = new URL(`https://mybusiness.googleapis.com/v4/${locationName}/reviews`);
    url.searchParams.set('pageSize', '50');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = (await response.json()) as any;
    if (!response.ok) throw new Error(data?.error?.message || `Google reviews request failed with HTTP ${response.status}`);
    return {
      reviews: (data.reviews || []).map((review: any) => ({
        reviewId: String(review.name || '').split('/').pop() || '',
        name: review.name,
        reviewer: { displayName: review.reviewer?.displayName || 'Google user', profilePhotoUrl: review.reviewer?.profilePhotoUrl, isAnonymous: !review.reviewer?.displayName },
        starRating: ({ ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as Record<string, 1|2|3|4|5>)[review.starRating] || 5,
        comment: review.comment,
        createTime: review.createTime,
        updateTime: review.updateTime,
      })),
      nextPageToken: data.nextPageToken,
    };
  }

  async publishReviewReply(accessToken: string, reviewName: string, comment: string): Promise<{ replyName: string; comment: string; updateTime: string }> {
    if (!accessToken || !reviewName || !comment?.trim()) throw new Error('Google access token, review name, and reply text are required');
    const response = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    const data = (await response.json()) as any;
    if (!response.ok) throw new Error(data?.error?.message || `Google reply publication failed with HTTP ${response.status}`);
    return { replyName: data.name || `${reviewName}/reply`, comment: data.comment || comment, updateTime: data.updateTime || new Date().toISOString() };
  }

  async deleteReviewReply(accessToken: string, reviewName: string): Promise<void> {
    if (!accessToken || !reviewName) throw new Error('Google access token and review name are required');
    const response = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok && response.status !== 404) {
      const data = (await response.json().catch(() => ({}))) as any;
      throw new Error(data?.error?.message || `Google reply deletion failed with HTTP ${response.status}`);
    }
  }
}
