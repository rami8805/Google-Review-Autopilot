import type { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from './authService';
import type { User, UserRole, SaaSCustomer } from '../../../shared/types/domain';
import type { ApiErrorResponse } from '../../../shared/types/api';

export interface AuthenticatedRequest extends Request {
  user?: User;
  saasCustomerId?: string;
  tokenPayload?: TokenPayload;
}

function sendAuthError(
  res: Response,
  status: number,
  code: 'AUTHENTICATION_REQUIRED' | 'TOKEN_EXPIRED' | 'FORBIDDEN' | 'TENANT_MISMATCH',
  message: string,
  details?: Record<string, unknown>
) {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(status).json(payload);
}

export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendAuthError(res, 401, 'AUTHENTICATION_REQUIRED', 'Missing or malformed Authorization header');
  }

  const token = authHeader.substring(7).trim();
  const payload = authService.verifyToken(token);
  if (!payload) {
    return sendAuthError(res, 401, 'TOKEN_EXPIRED', 'Token is invalid or has expired');
  }

  const user = authService.getUserById(payload.userId);
  if (!user) {
    return sendAuthError(res, 401, 'AUTHENTICATION_REQUIRED', 'User account associated with token no longer exists');
  }

  req.user = user;
  req.saasCustomerId = payload.saasCustomerId;
  req.tokenPayload = payload;
  next();
}

/**
 * Optional authentication middleware: if token is supplied, validates and sets req.user.
 * If not supplied, falls back to demo account in development environment.
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = authService.verifyToken(token);
    if (payload) {
      const user = authService.getUserById(payload.userId);
      if (user) {
        req.user = user;
        req.saasCustomerId = payload.saasCustomerId;
        req.tokenPayload = payload;
        return next();
      }
    }
  }

  // Fallback to demo tenant for backwards compatibility with existing UI demo mode
  const defaultDemoUser = authService.getUserById('usr_demo_01');
  if (defaultDemoUser) {
    req.user = defaultDemoUser;
    req.saasCustomerId = defaultDemoUser.saasCustomerId;
  }
  next();
}

/**
 * Role normalization to support both legacy and new standardized SaaS roles
 */
function normalizeRole(role: UserRole): string {
  switch (role) {
    case 'CUSTOMER_OWNER':
    case 'OWNER':
      return 'OWNER';
    case 'CUSTOMER_MEMBER':
    case 'MEMBER':
      return 'MEMBER';
    case 'PLATFORM_ADMIN':
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return 'ADMIN';
    default:
      return role;
  }
}

/**
 * Server-side RBAC Guard
 */
export function requireRole(allowedRoles: UserRole[]) {
  const normalizedAllowed = new Set(allowedRoles.map(normalizeRole));

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendAuthError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required for this operation');
    }

    const userNormalized = normalizeRole(req.user.role);

    // PLATFORM_ADMIN / SUPER_ADMIN has global authority
    if (userNormalized === 'ADMIN') {
      return next();
    }

    if (!normalizedAllowed.has(userNormalized)) {
      return sendAuthError(res, 403, 'FORBIDDEN', 'Insufficient role permissions for this operation', {
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Tenant Isolation Guard
 * Prevents SaaSCustomer A from reading, modifying, or accessing SaaSCustomer B's resources.
 */
export function tenantGuard(extractCustomerId?: (req: Request) => string | undefined) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.saasCustomerId) {
      return sendAuthError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    }

    // Platform admins can access cross-tenant resources for support/telemetry
    if (normalizeRole(req.user.role) === 'ADMIN') {
      return next();
    }

    // Extract target customer ID from parameter, query, header, or custom callback
    const targetCustomerId =
      (extractCustomerId && extractCustomerId(req)) ||
      req.params.saasCustomerId ||
      req.params.customerId ||
      req.query.saasCustomerId ||
      req.headers['x-saas-customer-id'];

    if (targetCustomerId && targetCustomerId !== req.saasCustomerId) {
      return sendAuthError(res, 403, 'TENANT_MISMATCH', 'Forbidden: Attempted cross-tenant access', {
        authenticatedTenant: req.saasCustomerId,
        attemptedTenant: targetCustomerId,
      });
    }

    next();
  };
}
