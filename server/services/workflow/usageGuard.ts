/**
 * Usage Guard & Cost Control Service
 *
 * Enforces per-tenant rate limits and AI call quotas so a single customer
 * cannot trigger runaway AI calls due to buggy polling loops or rapid syncs.
 */

import type { UsageGuardConfig } from './types';

export interface UsageStatus {
  callsLastMinute: number;
  callsLastHour: number;
  maxAiCallsPerHour: number;
  maxBurstPerMinute: number;
  isThrottled: boolean;
  throttleReason?: string;
}

export class UsageGuard {
  private config: UsageGuardConfig;
  // Map of saasCustomerId -> array of timestamps (ms) of AI calls
  private callLog: Map<string, number[]> = new Map();

  constructor(config?: Partial<UsageGuardConfig>) {
    this.config = {
      maxAiCallsPerHour: config?.maxAiCallsPerHour ?? 60,
      maxBurstPerMinute: config?.maxBurstPerMinute ?? 10,
    };
  }

  /**
   * Check if a tenant has remaining AI quota without consuming.
   */
  canConsume(saasCustomerId: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const timestamps = this.callLog.get(saasCustomerId) || [];

    // Filter out calls older than 1 hour
    const oneHourAgo = now - 3600 * 1000;
    const callsLastHour = timestamps.filter((t) => t > oneHourAgo);

    // Filter out calls older than 1 minute
    const oneMinuteAgo = now - 60 * 1000;
    const callsLastMinute = callsLastHour.filter((t) => t > oneMinuteAgo);

    if (callsLastMinute.length >= this.config.maxBurstPerMinute) {
      return {
        allowed: false,
        reason: `AI burst rate limit reached (${callsLastMinute.length}/${this.config.maxBurstPerMinute} calls in 1 minute). Throttled to prevent cost runaway.`,
      };
    }

    if (callsLastHour.length >= this.config.maxAiCallsPerHour) {
      return {
        allowed: false,
        reason: `AI hourly quota reached (${callsLastHour.length}/${this.config.maxAiCallsPerHour} calls in 1 hour). Throttled to prevent cost runaway.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Try to record an AI call. Throws or returns false if budget exceeded.
   */
  checkAndConsume(saasCustomerId: string): { allowed: boolean; reason?: string } {
    const check = this.canConsume(saasCustomerId);
    if (!check.allowed) {
      return check;
    }

    const now = Date.now();
    const oneHourAgo = now - 3600 * 1000;
    const current = (this.callLog.get(saasCustomerId) || []).filter((t) => t > oneHourAgo);
    current.push(now);
    this.callLog.set(saasCustomerId, current);

    return { allowed: true };
  }

  getUsageStatus(saasCustomerId: string): UsageStatus {
    const now = Date.now();
    const timestamps = this.callLog.get(saasCustomerId) || [];
    const oneHourAgo = now - 3600 * 1000;
    const oneMinuteAgo = now - 60 * 1000;

    const callsLastHour = timestamps.filter((t) => t > oneHourAgo).length;
    const callsLastMinute = timestamps.filter((t) => t > oneMinuteAgo).length;

    const check = this.canConsume(saasCustomerId);

    return {
      callsLastMinute,
      callsLastHour,
      maxAiCallsPerHour: this.config.maxAiCallsPerHour,
      maxBurstPerMinute: this.config.maxBurstPerMinute,
      isThrottled: !check.allowed,
      throttleReason: check.reason,
    };
  }

  resetForCustomer(saasCustomerId: string): void {
    this.callLog.delete(saasCustomerId);
  }

  clearAll(): void {
    this.callLog.clear();
  }
}
