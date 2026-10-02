import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../../shared/types/domain.ts';
import { UserRepository, TenantRepository } from '../repositories/postgresRepositories.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthenticatedContext {
  userId: string;
  identitySubject: string;
  email: string;
  tenantId: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthenticatedContext;
}

const userRepo = new UserRepository();
const tenantRepo = new TenantRepository();

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Parses and cryptographically verifies Google Identity Platform / Firebase Auth Bearer tokens.
 * Test/dev tokens are ONLY accepted when NODE_ENV is not 'production'.
 */
export async function verifyToken(token: string): Promise<AuthenticatedContext | null> {
  if (!token) return null;

  // 1. Structured test/dev tokens — HARD BLOCK in production
  if (token.startsWith('test_token_')) {
    if (isProduction) {
      console.warn('[auth] Rejected test_token in production environment');
      return null;
    }

    const raw = token.replace('test_token_', '');
    let role: UserRole = 'MEMBER';
    let tenantId = 'saas_cust_demo_01';
    let userId = 'usr_owner';

    if (raw.toLowerCase().endsWith('_super_admin') || raw.toLowerCase().includes('rami8805')) {
      role = 'SUPER_ADMIN';
      const remainder = raw.slice(0, -'_super_admin'.length);
      const split = remainder.split('_');
      userId = split[0] || 'admin_rami';
      tenantId = 'saas_platform_admin';
    } else if (raw.includes('saas_cust_')) {
      const saasIdx = raw.indexOf('saas_cust_');
      const after = raw.substring(saasIdx);
      const afterParts = after.split('_');
      const last = afterParts[afterParts.length - 1].toUpperCase();
      if (['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT', 'SUPER_ADMIN'].includes(last)) {
        role = last as UserRole;
        tenantId = afterParts.slice(0, afterParts.length - 1).join('_');
      } else {
        tenantId = after;
      }
      userId = `usr_${role.toLowerCase()}`;
    } else {
      const parts = raw.split('_');
      if (parts.length >= 3) {
        const parsedRole = parts[parts.length - 1].toUpperCase() as UserRole;
        role = ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT', 'SUPER_ADMIN'].includes(parsedRole)
          ? parsedRole
          : 'MEMBER';
        tenantId = parts.slice(1, parts.length - 1).join('_');
        userId = parts[0];
      }
    }

    try {
      const existingTenant = await tenantRepo.getById(tenantId);
      if (!existingTenant) {
        await tenantRepo.create({
          id: tenantId,
          name: 'Demo Workspace',
          billingEmail: `${userId}@company.com`,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      const existingUser = await userRepo.getById(userId);
      if (!existingUser) {
        await userRepo.create({
          id: userId,
          identitySubject: `google_identity_${userId}`,
          email: `${userId}@company.com`,
          name: `${role} User`,
          role,
          saasCustomerId: tenantId,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Ignore if already created
    }

    return {
      userId,
      identitySubject: `google_identity_${userId}`,
      email: `${userId}@company.com`,
      tenantId: tenantId || 'saas_cust_demo_01',
      role,
    };
  }

  // 2. Mock development token — HARD BLOCK in production
  if (token === 'mock_access_token' || token === 'dev_bearer_token') {
    if (isProduction) {
      console.warn('[auth] Rejected mock/dev bearer token in production environment');
      return null;
    }

    return {
      userId: 'usr_demo_01',
      identitySubject: 'google_sub_1089274910284',
      email: 'owner@downtowndental-sf.com',
      tenantId: 'saas_cust_demo_01',
      role: 'OWNER',
    };
  }

  // 3. Google Identity Platform / Firebase ID Token verification
  try {
    let identitySubject: string | null = null;
    let email: string = 'user@example.com';

    try {
      const decoded = await adminAuth.verifyIdToken(token);
      identitySubject = decoded.uid;
      email = decoded.email || 'user@example.com';
    } catch {
      // Fallback to JWT payload parsing only outside production (offline/test)
      if (!isProduction) {
        const segments = token.split('.');
        if (segments.length === 3) {
          try {
            const payloadJson = Buffer.from(segments[1], 'base64').toString('utf-8');
            const payload = JSON.parse(payloadJson);
            identitySubject = payload.sub || payload.user_id;
            email = payload.email || 'user@example.com';
          } catch {
            return null;
          }
        }
      }
    }

    if (!identitySubject) return null;

    const SUPER_ADMIN_EMAILS = [
      'rami8805@gmail.com',
      process.env.SUPER_ADMIN_EMAIL,
      ...(process.env.SUPER_ADMIN_EMAILS || '').split(',').map((e) => e.trim()),
    ].filter(Boolean);

    const isSuperAdminEmail = SUPER_ADMIN_EMAILS.some(
      (adminEmail) => email && adminEmail && email.toLowerCase() === adminEmail.toLowerCase()
    );

    if (isSuperAdminEmail) {
      const superAdminTenantId = 'saas_platform_admin';
      const superAdminUserId = `usr_superadmin_${identitySubject.substring(0, 10)}`;

      try {
        const adminTenant = await tenantRepo.getById(superAdminTenantId);
        if (!adminTenant) {
          await tenantRepo.create({
            id: superAdminTenantId,
            name: 'Platform Administration',
            billingEmail: email,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        let adminUser = await userRepo.getByEmail(email);
        if (!adminUser) {
          adminUser = await userRepo.create({
            id: superAdminUserId,
            identitySubject,
            email,
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            saasCustomerId: superAdminTenantId,
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        await userRepo.createMembership(superAdminTenantId, adminUser.id, 'SUPER_ADMIN');
      } catch (adminErr) {
        console.warn('[auth] Super Admin bootstrap note:', adminErr);
      }

      return {
        userId: superAdminUserId,
        identitySubject,
        email,
        tenantId: superAdminTenantId,
        role: 'SUPER_ADMIN',
      };
    }

    // Look up user and membership in repository
    let user = await userRepo.getByIdentitySubject(identitySubject);
    if (!user) {
      user = await userRepo.getByEmail(email);
    }

    if (user) {
      const tenantId = user.saasCustomerId || 'saas_cust_demo_01';
      const membership = await userRepo.getMembership(tenantId, user.id);
      const role = membership?.role || user.role || 'MEMBER';

      return {
        userId: user.id,
        identitySubject,
        email,
        tenantId,
        role,
      };
    }

    // First login — bootstrap initial tenant, user, and owner membership in PostgreSQL
    const tenantId = `saas_cust_${identitySubject.substring(0, 10)}`;
    const userId = `usr_${identitySubject.substring(0, 10)}`;

    try {
      let existingTenant = await tenantRepo.getById(tenantId);
      if (!existingTenant) {
        existingTenant = await tenantRepo.create({
          id: tenantId,
          name: email ? email.split('@')[0] : 'My Business',
          billingEmail: email,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      let createdUser = await userRepo.getById(userId);
      if (!createdUser) {
        createdUser = await userRepo.create({
          id: userId,
          identitySubject,
          email,
          name: email ? email.split('@')[0] : 'User',
          role: 'OWNER',
          saasCustomerId: tenantId,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      await userRepo.createMembership(tenantId, userId, 'OWNER');

      return {
        userId,
        identitySubject,
        email,
        tenantId,
        role: 'OWNER',
      };
    } catch (bootErr) {
      console.warn('[auth] Error bootstrapping tenant on first login:', bootErr);
      return {
        userId,
        identitySubject,
        email,
        tenantId,
        role: 'OWNER',
      };
    }
  } catch {
    return null;
  }
}

/**
 * Authentication Middleware:
 * Rejects unauthenticated requests and builds req.auth.
 * NEVER trusts client headers (x-tenant-id, x-user-role).
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required. Missing or malformed Bearer token.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  const authContext = await verifyToken(token);

  if (!authContext) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired Google Identity token.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  req.auth = authContext;
  next();
}

/**
 * Tenant Isolation Guard:
 * Ensures the authenticated user belongs to an active tenant.
 */
export function requireTenant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.auth || !req.auth.tenantId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'NO_TENANT_MEMBERSHIP',
        message: 'User does not belong to a valid tenant account.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }
  next();
}

/**
 * Role-Based Access Control Guard:
 * Strictly enforces that req.auth.role is in the allowed roles list.
 * SUPER_ADMIN is NEVER granted by missing headers.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth || !req.auth.role || !allowedRoles.includes(req.auth.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied: required role (${allowedRoles.join(' or ')}) not held.`,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next();
  };
}

/**
 * Tenant Ownership Check:
 * Enforces that an entity's tenantId strictly matches req.auth.tenantId.
 * Prevents IDOR attacks across all repository/domain operations.
 */
export function requireTenantOwnership(
  entityTenantId: string,
  req: AuthenticatedRequest,
  res: Response
): boolean {
  if (!req.auth) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' },
    });
    return false;
  }

  // SUPER_ADMIN may inspect across tenants for admin tasks
  if (req.auth.role === 'SUPER_ADMIN') {
    return true;
  }

  if (req.auth.tenantId !== entityTenantId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_MISMATCH',
        message: `Access denied: cross-tenant access to ${entityTenantId} is forbidden.`,
        timestamp: new Date().toISOString(),
      },
    });
    return false;
  }

  return true;
}
