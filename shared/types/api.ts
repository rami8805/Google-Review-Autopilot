/**
 * Google Review Autopilot - Shared API Response Contracts
 *
 * All HTTP JSON endpoints return structured envelopes following these standards.
 */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    pagination?: PaginationMeta;
    requestId?: string;
  };
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'TENANT_MISMATCH'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PROVIDER_ERROR'
  | 'GOOGLE_API_ERROR'
  | 'AI_GENERATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR';

export interface FieldValidationError {
  field: string;
  message: string;
  rule?: string;
}

export interface ProviderErrorDetail {
  provider: 'GOOGLE_BUSINESS_PROFILE' | 'GEMINI' | 'STRIPE' | 'RESEND';
  providerCode?: string | number;
  providerMessage?: string;
  retryable: boolean;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: {
      validationErrors?: FieldValidationError[];
      providerError?: ProviderErrorDetail;
      requiredRole?: string;
      tenantId?: string;
      [key: string]: unknown;
    };
    requestId?: string;
    timestamp: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export type PaginatedResponse<T> = ApiSuccessResponse<PaginatedData<T>>;
