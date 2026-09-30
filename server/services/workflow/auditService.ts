/**
 * Audit Trail Service for Google Review Autopilot Workflow
 *
 * Implements strict audit logging for all 11 required lifecycle actions:
 * - review received
 * - AI analyzed
 * - draft generated
 * - auto-approved
 * - approval requested
 * - approved
 * - rejected
 * - published
 * - publish failed
 * - automation paused
 * - automation resumed
 */

import type { AuditEvent } from '../../../shared/types/domain';
import type { WorkflowAuditAction } from './types';

export interface IAuditService {
  record(params: {
    saasCustomerId: string;
    action: WorkflowAuditAction;
    targetResourceType: AuditEvent['targetResourceType'];
    targetResourceId: string;
    actorUserId?: string;
    actorType?: AuditEvent['actorType'];
    details?: Record<string, unknown>;
  }): Promise<AuditEvent>;

  getEventsForCustomer(saasCustomerId: string): Promise<AuditEvent[]>;
  getEventsForResource(saasCustomerId: string, resourceId: string): Promise<AuditEvent[]>;
  clearEventsForTesting?(): void;
}

export class AuditService implements IAuditService {
  private events: AuditEvent[] = [];

  async record(params: {
    saasCustomerId: string;
    action: WorkflowAuditAction;
    targetResourceType: AuditEvent['targetResourceType'];
    targetResourceId: string;
    actorUserId?: string;
    actorType?: AuditEvent['actorType'];
    details?: Record<string, unknown>;
  }): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      saasCustomerId: params.saasCustomerId,
      actorUserId: params.actorUserId,
      actorType: params.actorType || 'SYSTEM_JOB',
      action: params.action,
      targetResourceType: params.targetResourceType,
      targetResourceId: params.targetResourceId,
      details: params.details,
      timestamp: new Date().toISOString(),
    };

    this.events.unshift(event);
    return event;
  }

  async getEventsForCustomer(saasCustomerId: string): Promise<AuditEvent[]> {
    return this.events.filter((e) => e.saasCustomerId === saasCustomerId);
  }

  async getEventsForResource(saasCustomerId: string, resourceId: string): Promise<AuditEvent[]> {
    return this.events.filter(
      (e) => e.saasCustomerId === saasCustomerId && e.targetResourceId === resourceId
    );
  }

  clearEventsForTesting(): void {
    this.events = [];
  }
}
