/**
 * Multi-Tenant and Data Layer Error Classes
 */

export class TenantMismatchError extends Error {
  public readonly code = 'TENANT_MISMATCH';
  public readonly statusCode = 403;
  public readonly requestedTenantId?: string;
  public readonly targetTenantId?: string;

  constructor(message = 'Tenant isolation violation: cross-tenant access prohibited', details?: { requestedTenantId?: string; targetTenantId?: string }) {
    super(message);
    this.name = 'TenantMismatchError';
    this.requestedTenantId = details?.requestedTenantId;
    this.targetTenantId = details?.targetTenantId;
    Object.setPrototypeOf(this, TenantMismatchError.prototype);
  }
}

export class UnauthorizedError extends Error {
  public readonly code = 'AUTHENTICATION_REQUIRED';
  public readonly statusCode = 401;

  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends Error {
  public readonly code = 'FORBIDDEN';
  public readonly statusCode = 403;
  public readonly requiredRole?: string;

  constructor(message = 'Insufficient permissions for this operation', requiredRole?: string) {
    super(message);
    this.name = 'ForbiddenError';
    this.requiredRole = requiredRole;
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class EntityNotFoundError extends Error {
  public readonly code = 'NOT_FOUND';
  public readonly statusCode = 404;
  public readonly entityName: string;
  public readonly entityId: string;

  constructor(entityName: string, entityId: string) {
    super(`${entityName} with id "${entityId}" was not found`);
    this.name = 'EntityNotFoundError';
    this.entityName = entityName;
    this.entityId = entityId;
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }
}

export class DuplicateEntityError extends Error {
  public readonly code = 'CONFLICT';
  public readonly statusCode = 409;
  public readonly entityName: string;
  public readonly field: string;
  public readonly value: string;

  constructor(entityName: string, field: string, value: string) {
    super(`${entityName} with ${field} "${value}" already exists`);
    this.name = 'DuplicateEntityError';
    this.entityName = entityName;
    this.field = field;
    this.value = value;
    Object.setPrototypeOf(this, DuplicateEntityError.prototype);
  }
}

export class InvalidOwnershipError extends Error {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'InvalidOwnershipError';
    Object.setPrototypeOf(this, InvalidOwnershipError.prototype);
  }
}
