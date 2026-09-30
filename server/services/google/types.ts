/**
 * Google Business Profile Integration - Types and DTOs
 *
 * Adheres strictly to shared domain taxonomy and INTEGRATION-CONTRACT.md.
 * Google tokens remain server-side only.
 */

export interface GoogleAccountDto {
  accountId: string; // e.g. "accounts/1089274910284"
  accountName: string;
  type?: 'PERSONAL' | 'LOCATION_GROUP' | 'ORGANIZATION';
  role?: string;
  verificationState?: 'VERIFIED' | 'UNVERIFIED';
}

export interface GoogleLocationDto {
  locationId: string; // e.g. "locations/loc_98231"
  locationName: string;
  addressLines: string[];
  locality: string;
  administrativeArea: string;
  postalCode: string;
  country: string;
  primaryCategory?: string;
  primaryPhone?: string;
  websiteUri?: string;
  googlePlaceId?: string;
}

export interface GoogleReviewDto {
  reviewId: string; // e.g. "google_rev_101"
  name: string; // e.g. "accounts/101/locations/loc_001/reviews/google_rev_101"
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
    isAnonymous: boolean;
  };
  starRating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createTime: string;
  updateTime?: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

export interface GoogleReplyDto {
  replyName: string; // e.g. "accounts/101/locations/loc_001/reviews/google_rev_101/reply"
  comment: string;
  updateTime: string;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // in seconds
  tokenType?: string;
  scope?: string;
  receivedAt: number; // timestamp in ms
}

export interface StoredGoogleCredential {
  saasCustomerId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  expiresAt: number; // timestamp in ms
  scopes: string[];
  googleAccountId?: string;
  googleLocationName?: string;
  updatedAt: string;
}

export interface ConnectionHealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'EXPIRED' | 'REVOKED' | 'DISCONNECTED';
  lastCheckedAt: string;
  message: string;
  scopes: string[];
  hasRefreshToken: boolean;
  expiresAt?: string;
  mode: 'LIVE' | 'MOCK';
}

export interface SyncResult {
  locationId: string;
  totalFetched: number;
  newReviewsCount: number;
  updatedReviewsCount: number;
  duplicateReviewsSkipped: number;
  autoPublishedCount: number;
  stagedForApprovalCount: number;
  errors: string[];
  timestamp: string;
}

/**
 * Clean Service Interface for Google Business Profile operations
 */
export interface IGoogleBusinessProfileService {
  connect(params: {
    saasCustomerId: string;
    redirectUri?: string;
    stateMetadata?: Record<string, string>;
  }): Promise<{ authUrl: string; state: string }>;

  handleCallback(params: {
    code: string;
    state: string;
    saasCustomerId: string;
  }): Promise<{ tokens: GoogleTokens; accountId: string }>;

  listAccounts(saasCustomerId: string): Promise<GoogleAccountDto[]>;

  listLocations(saasCustomerId: string, accountId: string): Promise<GoogleLocationDto[]>;

  listReviews(
    saasCustomerId: string,
    locationName: string,
    pageToken?: string,
    pageSize?: number
  ): Promise<{
    reviews: GoogleReviewDto[];
    nextPageToken?: string;
    totalReviewCount?: number;
  }>;

  publishReply(
    saasCustomerId: string,
    reviewName: string,
    comment: string
  ): Promise<GoogleReplyDto>;

  updateReply(
    saasCustomerId: string,
    reviewName: string,
    comment: string
  ): Promise<GoogleReplyDto>;

  deleteReply(
    saasCustomerId: string,
    reviewName: string
  ): Promise<void>;

  healthCheck(saasCustomerId: string): Promise<ConnectionHealthStatus>;

  disconnect(saasCustomerId: string): Promise<void>;
}

/**
 * Backward-compatible low-level provider interface matching INTEGRATION-CONTRACT.md
 */
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
