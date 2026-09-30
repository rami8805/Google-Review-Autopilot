import type {
  UsageEvent,
  UsageEventType,
  SubscriptionPlan,
} from '../../../shared/types/domain';
import { getPlanDefinition } from '../../../shared/constants/billing';

export interface CustomerUsageSummary {
  saasCustomerId: string;
  monthlyRepliesUsed: number;
  monthlyReplyLimit: number;
  locationsActive: number;
  locationLimit: number;
  canGenerateReply: boolean;
  canAddLocation: boolean;
  periodStart: string;
  periodEnd: string;
}

export class UsageService {
  private events: UsageEvent[] = [];

  constructor() {
    this.seedDefaultUsage();
  }

  private seedDefaultUsage() {
    // Seed some initial usage for demo tenant
    const demoTenant = 'saas_cust_demo_01';
    const now = Date.now();
    for (let i = 0; i < 12; i++) {
      this.events.push({
        id: `use_demo_${i}`,
        saasCustomerId: demoTenant,
        eventType: 'AI_REPLY_GENERATED',
        timestamp: new Date(now - i * 3600000 * 24).toISOString(),
      });
    }
  }

  public async recordUsage(
    saasCustomerId: string,
    eventType: UsageEventType,
    metadata?: Record<string, unknown>
  ): Promise<UsageEvent> {
    const event: UsageEvent = {
      id: `use_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      saasCustomerId,
      eventType,
      metadata,
      timestamp: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }

  public getRepliesCountInPeriod(
    saasCustomerId: string,
    periodStart: string,
    periodEnd: string
  ): number {
    const startMs = new Date(periodStart).getTime();
    const endMs = new Date(periodEnd).getTime();

    return this.events.filter((e) => {
      if (e.saasCustomerId !== saasCustomerId) return false;
      if (e.eventType !== 'AI_REPLY_GENERATED' && e.eventType !== 'REPLY_AUTO_PUBLISHED') return false;
      const t = new Date(e.timestamp).getTime();
      return t >= startMs && t <= endMs;
    }).length;
  }

  public getUsageSummary(
    saasCustomerId: string,
    plan: SubscriptionPlan,
    currentPeriodStart: string,
    currentPeriodEnd: string,
    activeLocationsCount = 1
  ): CustomerUsageSummary {
    const planDef = getPlanDefinition(plan);
    const monthlyRepliesUsed = this.getRepliesCountInPeriod(
      saasCustomerId,
      currentPeriodStart,
      currentPeriodEnd
    );

    const monthlyReplyLimit = planDef.limits.monthlyReplyLimit;
    const locationLimit = planDef.limits.locationLimit;

    return {
      saasCustomerId,
      monthlyRepliesUsed,
      monthlyReplyLimit,
      locationsActive: activeLocationsCount,
      locationLimit,
      canGenerateReply: monthlyRepliesUsed < monthlyReplyLimit,
      canAddLocation: activeLocationsCount < locationLimit,
      periodStart: currentPeriodStart,
      periodEnd: currentPeriodEnd,
    };
  }

  public checkQuota(
    saasCustomerId: string,
    plan: SubscriptionPlan,
    currentPeriodStart: string,
    currentPeriodEnd: string,
    action: 'GENERATE_REPLY' | 'CONNECT_LOCATION',
    currentLocationCount = 1
  ): { allowed: boolean; reason?: string } {
    const summary = this.getUsageSummary(
      saasCustomerId,
      plan,
      currentPeriodStart,
      currentPeriodEnd,
      currentLocationCount
    );

    if (action === 'GENERATE_REPLY') {
      if (!summary.canGenerateReply) {
        return {
          allowed: false,
          reason: `Monthly reply limit of ${summary.monthlyReplyLimit} reached for plan ${plan}. Upgrade plan to generate more replies.`,
        };
      }
    } else if (action === 'CONNECT_LOCATION') {
      if (!summary.canAddLocation) {
        return {
          allowed: false,
          reason: `Location limit of ${summary.locationLimit} reached for plan ${plan}. Upgrade plan to manage more locations.`,
        };
      }
    }

    return { allowed: true };
  }

  public clearEventsForCustomer(saasCustomerId: string): void {
    this.events = this.events.filter((e) => e.saasCustomerId !== saasCustomerId);
  }
}

export const usageService = new UsageService();
