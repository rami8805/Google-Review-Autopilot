export * from './automation';

export const APP_NAME = 'Google Review Autopilot';
export const APP_SLOGAN = 'Safe, automated Google Business Profile review replies for local businesses';

export const API_ENDPOINTS = {
  AUTH: {
    ME: '/api/auth/me',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
  },
  GOOGLE: {
    CONNECT: '/api/google/connect',
    CALLBACK: '/api/google/callback',
    LOCATIONS: '/api/google/locations',
    SYNC_REVIEWS: '/api/google/sync-reviews',
  },
  REVIEWS: {
    LIST: '/api/reviews',
    GET: (id: string) => `/api/reviews/${id}`,
    APPROVE: (id: string) => `/api/reviews/${id}/approve`,
    REGENERATE: (id: string) => `/api/reviews/${id}/regenerate`,
    UPDATE_REPLY: (id: string) => `/api/reviews/${id}/reply`,
  },
  SETTINGS: {
    RULES: '/api/settings/automation-rules',
    BRAND_VOICE: '/api/settings/brand-voice',
  },
  BILLING: {
    SUBSCRIPTION: '/api/billing/subscription',
    PORTAL: '/api/billing/portal',
  },
  SUPPORT: {
    TICKETS: '/api/support/tickets',
  },
  ADMIN: {
    CUSTOMERS: '/api/admin/customers',
    METRICS: '/api/admin/metrics',
  },
} as const;
