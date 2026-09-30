import type { TenantContext } from '../../../shared/types/database';
import type { UserRole } from '../../../shared/types/domain';
import { TenantMismatchError, ForbiddenError, UnauthorizedError, InvalidOwnershipError } from './errors';
import { dbStore, DatabaseStore } from './dbStore';

/**
 * Tenant Guard - Enforces multi-tenancy boundaries, customer isolation,
 * and role-based authorization checks across all data layer operations.
 */
export class TenantGuard {
  /**
   * Resolves the authoritative ownership path to SaaSCustomer for any entity.
   */
  public static resolveTenantOwnership(
    entityType: string,
    entity: Record<string, any>,
    store: DatabaseStore = dbStore
  ): string {
    if (!entity) {
      throw new InvalidOwnershipError(`Cannot resolve tenant for null or undefined entity of type ${entityType}`);
    }

    switch (entityType) {
      case 'SaaSCustomer':
        return entity.id;

      case 'Business':
      case 'Subscription':
      case 'GoogleConnection':
      case 'UsageEvent':
      case 'AuditEvent':
      case 'SupportTicket':
      case 'AutomationRule':
      case 'BrandVoice':
        if (!entity.saasCustomerId) {
          throw new InvalidOwnershipError(`${entityType} must specify a valid saasCustomerId`);
        }
        return entity.saasCustomerId;

      case 'BusinessLocation': {
        if (entity.saasCustomerId) {
          return entity.saasCustomerId;
        }
        if (entity.businessId) {
          const business = store.businesses.get(entity.businessId);
          if (business) {
            return business.saasCustomerId;
          }
        }
        throw new InvalidOwnershipError('BusinessLocation must have a valid businessId or saasCustomerId linked to a tenant');
      }

      case 'Review': {
        if (entity.saasCustomerId) {
          return entity.saasCustomerId;
        }
        if (entity.businessLocationId) {
          const loc = store.businessLocations.get(entity.businessLocationId);
          if (loc) {
            return this.resolveTenantOwnership('BusinessLocation', loc, store);
          }
        }
        throw new InvalidOwnershipError('Review must be linked to a valid BusinessLocation belonging to a tenant');
      }

      case 'SupportMessage': {
        const ticketId = entity.supportTicketId || entity.ticketId;
        if (ticketId) {
          const ticket = store.supportTickets.get(ticketId);
          if (ticket) {
            return ticket.saasCustomerId;
          }
        }
        throw new InvalidOwnershipError('SupportMessage must belong to an existing SupportTicket belonging to a tenant');
      }

      case 'User':
        return entity.saasCustomerId || '';

      default:
        if (entity.saasCustomerId) {
          return entity.saasCustomerId;
        }
        throw new InvalidOwnershipError(`Unknown entity type "${entityType}" cannot resolve tenant ownership`);
    }
  }

  /**
   * Enforces customer isolation.
   * Throws TenantMismatchError if a non-super-admin tries to read/write another tenant's data.
   */
  public static assertTenantAccess(
    context: TenantContext,
    targetTenantId: string,
    operationName = 'operation'
  ): void {
    if (!context) {
      throw new UnauthorizedError('Authentication context required');
    }

    // SUPER_ADMIN has platform-wide authority
    if (context.isSuperAdmin || context.role === 'SUPER_ADMIN') {
      return;
    }

    if (!context.saasCustomerId) {
      throw new UnauthorizedError('Tenant context missing saasCustomerId');
    }

    if (!targetTenantId) {
      throw new InvalidOwnershipError(`Target tenant ID cannot be empty for ${operationName}`);
    }

    if (context.saasCustomerId !== targetTenantId) {
      throw new TenantMismatchError(
        `Cross-tenant access prohibited for ${operationName}: tenant "${context.saasCustomerId}" attempted to access tenant "${targetTenantId}"`,
        {
          requestedTenantId: context.saasCustomerId,
          targetTenantId,
        }
      );
    }
  }

  /**
   * Enforces admin-only access for cross-tenant or platform-level queries.
   */
  public static assertAdminAccess(context: TenantContext, operationName = 'admin operation'): void {
    if (!context) {
      throw new UnauthorizedError('Authentication context required');
    }

    const isAdmin = context.isSuperAdmin || context.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenError(
        `Admin-only access required for ${operationName}. Caller role is "${context.role || 'NONE'}"`,
        'SUPER_ADMIN'
      );
    }
  }

  /**
   * Enforces required roles within a tenant (e.g. OWNER or ADMIN).
   */
  public static assertRoleAccess(
    context: TenantContext,
    allowedRoles: UserRole[],
    operationName = 'operation'
  ): void {
    if (!context) {
      throw new UnauthorizedError('Authentication context required');
    }

    // Super admin bypasses intra-tenant role restrictions
    if (context.isSuperAdmin || context.role === 'SUPER_ADMIN') {
      return;
    }

    if (!context.role || !allowedRoles.includes(context.role)) {
      throw new ForbiddenError(
        `Operation "${operationName}" requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${context.role || 'NONE'}`,
        allowedRoles.join(' | ')
      );
    }
  }

  /**
   * Validates hierarchical integrity:
   * e.g. BusinessLocation's businessId must belong to the tenant.
   */
  public static validateLocationHierarchy(
    businessId: string,
    tenantId: string,
    store: DatabaseStore = dbStore
  ): void {
    const business = store.businesses.get(businessId);
    if (!business) {
      throw new InvalidOwnershipError(`Referenced Business "${businessId}" does not exist`);
    }
    if (business.saasCustomerId !== tenantId) {
      throw new InvalidOwnershipError(
        `Business "${businessId}" belongs to tenant "${business.saasCustomerId}", not "${tenantId}"`
      );
    }
  }
}
