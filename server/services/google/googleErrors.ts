/**
 * Normalized Google Provider Errors
 *
 * Maps vendor-specific Google API codes and network failures
 * into standardized application errors matching INTEGRATION-CONTRACT.md.
 */

import type { ApiErrorCode, ProviderErrorDetail } from '../../../shared/types/api';

export type GoogleErrorCode =
  | 'OAUTH_FAILED'
  | 'TOKEN_EXPIRED'
  | 'PERMISSION_REVOKED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NOT_FOUND'
  | 'INVALID_CREDENTIALS'
  | 'NETWORK_ERROR'
  | 'REPLY_ALREADY_EXISTS'
  | 'INTERNAL_ERROR';

export class GoogleProviderError extends Error {
  public readonly code: GoogleErrorCode;
  public readonly provider = 'GOOGLE_BUSINESS_PROFILE' as const;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly originalError?: unknown;

  constructor(params: {
    message: string;
    code: GoogleErrorCode;
    statusCode?: number;
    retryable?: boolean;
    originalError?: unknown;
  }) {
    super(params.message);
    this.name = 'GoogleProviderError';
    this.code = params.code;
    this.statusCode = params.statusCode || 500;
    this.retryable = params.retryable ?? false;
    this.originalError = params.originalError;
  }

  toProviderErrorDetail(): ProviderErrorDetail {
    return {
      provider: 'GOOGLE_BUSINESS_PROFILE',
      providerCode: this.code,
      providerMessage: this.message,
      retryable: this.retryable,
    };
  }

  toApiErrorCode(): ApiErrorCode {
    switch (this.code) {
      case 'TOKEN_EXPIRED':
        return 'TOKEN_EXPIRED';
      case 'PERMISSION_REVOKED':
        return 'FORBIDDEN';
      case 'RATE_LIMIT_EXCEEDED':
        return 'RATE_LIMIT_EXCEEDED';
      case 'NOT_FOUND':
        return 'NOT_FOUND';
      case 'OAUTH_FAILED':
      case 'INVALID_CREDENTIALS':
        return 'AUTHENTICATION_REQUIRED';
      default:
        return 'GOOGLE_API_ERROR';
    }
  }
}

/**
 * Normalizes any error (HTTP response, network exception, or unknown error)
 * into a strongly-typed GoogleProviderError.
 */
export function normalizeGoogleError(err: unknown): GoogleProviderError {
  if (err instanceof GoogleProviderError) {
    return err;
  }

  const message = err instanceof Error ? err.message : String(err);
  const lowerMsg = message.toLowerCase();

  // Check for expired token / unauthorized
  if (lowerMsg.includes('token expired') || lowerMsg.includes('invalid_grant') || lowerMsg.includes('unauthorized') || lowerMsg.includes('401')) {
    return new GoogleProviderError({
      message: 'Google access token expired or invalid.',
      code: 'TOKEN_EXPIRED',
      statusCode: 401,
      retryable: true,
      originalError: err,
    });
  }

  // Check for permission revoked / forbidden
  if (lowerMsg.includes('permission denied') || lowerMsg.includes('access denied') || lowerMsg.includes('insufficient authentication scopes') || lowerMsg.includes('403')) {
    return new GoogleProviderError({
      message: 'Google Business Profile permission revoked or insufficient scopes.',
      code: 'PERMISSION_REVOKED',
      statusCode: 403,
      retryable: false,
      originalError: err,
    });
  }

  // Check for rate limit / quota
  if (lowerMsg.includes('rate limit') || lowerMsg.includes('quota exceeded') || lowerMsg.includes('429')) {
    return new GoogleProviderError({
      message: 'Google API rate limit or quota exceeded.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      retryable: true,
      originalError: err,
    });
  }

  // Check for not found
  if (lowerMsg.includes('not found') || lowerMsg.includes('404')) {
    return new GoogleProviderError({
      message: 'Requested Google Business Profile resource not found.',
      code: 'NOT_FOUND',
      statusCode: 404,
      retryable: false,
      originalError: err,
    });
  }

  // Check for network errors
  if (lowerMsg.includes('econnrefused') || lowerMsg.includes('etimedout') || lowerMsg.includes('fetch failed') || lowerMsg.includes('network error')) {
    return new GoogleProviderError({
      message: 'Network error connecting to Google API.',
      code: 'NETWORK_ERROR',
      statusCode: 503,
      retryable: true,
      originalError: err,
    });
  }

  return new GoogleProviderError({
    message: `Google Business Profile API error: ${message}`,
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    retryable: false,
    originalError: err,
  });
}
