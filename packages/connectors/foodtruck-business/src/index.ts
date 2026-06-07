import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { analyzeFunnel } from '@ai-company/business-funnel-engine';
import type { DecisionSupportResult, FunnelSnapshot } from '@ai-company/shared-types';
import type {
  FoodTruckBusinessMetrics,
  OwnerAcquisitionMetrics,
  TruckRegistryMetrics,
} from './types';
import {
  buildFoodTruckDecisionSupport,
  foodTruckDecisionContextFromMetrics,
} from './decision-support-adapter';
import {
  FOODTRUCK_FUNNEL_DEFINITION,
  foodTruckRegistryToStageCounts,
} from './funnel-config';

export interface FoodTruckBusinessConnectorConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

/**
 * Read-only FoodTruck-IL business metrics for owner acquisition intelligence.
 * No AI. No LLM. No writes.
 */
export class FoodTruckBusinessConnector {
  private readonly client: SupabaseClient | null;

  constructor(config?: FoodTruckBusinessConnectorConfig) {
    this.client =
      config?.supabaseUrl && config?.serviceRoleKey
        ? createClient(config.supabaseUrl, config.serviceRoleKey, {
            auth: { persistSession: false },
            db: { schema: 'public' },
          })
        : null;
  }

  get live(): boolean {
    return this.client !== null;
  }

  async fetchMetrics(): Promise<FoodTruckBusinessMetrics> {
    if (!this.client) {
      return { ...mockFoodTruckBusinessMetrics(), live: false };
    }

    const registry = await this.fetchRegistry();
    const acquisition = await this.fetchAcquisition(registry);
    const registrationTrend = await this.fetchRegistrationTrend();
    return { registry, acquisition, live: true, registrationTrend };
  }

  /** Generic funnel snapshot from registry counts (no FoodTruck logic in engine). */
  async fetchFunnelSnapshot(): Promise<FunnelSnapshot> {
    const metrics = await this.fetchMetrics();
    return buildFoodTruckFunnelSnapshot(metrics.registry);
  }

  /** Funnel snapshot + FoodTruck adapter → CEO recommendations (read-only). */
  async fetchDecisionSupport(): Promise<DecisionSupportResult> {
    const metrics = await this.fetchMetrics();
    const snapshot = buildFoodTruckFunnelSnapshot(metrics.registry);
    const context = foodTruckDecisionContextFromMetrics(metrics);
    return buildFoodTruckDecisionSupport(snapshot, context);
  }

  private async fetchRegistry(): Promise<TruckRegistryMetrics> {
    if (!this.client) throw new Error('FoodTruckBusinessConnector: no client');

    const c = this.client;
    const head = { count: 'exact' as const, head: true };
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [total, approved, pending, rejected, eventRows] = await Promise.all([
      c.from('trucks').select('*', head),
      c.from('trucks').select('*', head).eq('status', 'approved'),
      c.from('trucks').select('*', head).eq('status', 'pending'),
      c.from('trucks').select('*', head).eq('status', 'rejected'),
      c
        .from('truck_events')
        .select('truck_id')
        .gte('created_at', sevenDaysAgo)
        .not('truck_id', 'is', null),
    ]);

    const activeTruckIds = new Set(
      ((eventRows.data ?? []) as Array<{ truck_id: string | null }>)
        .map((r) => r.truck_id)
        .filter((id): id is string => !!id),
    );

    let activeTrucks = 0;
    if (activeTruckIds.size > 0) {
      const { count } = await c
        .from('trucks')
        .select('*', head)
        .eq('status', 'approved')
        .in('id', [...activeTruckIds]);
      activeTrucks = count ?? 0;
    }

    return {
      totalRegisteredTrucks: total.count ?? 0,
      approvedTrucks: approved.count ?? 0,
      pendingTrucks: pending.count ?? 0,
      rejectedTrucks: rejected.count ?? 0,
      activeTrucks,
    };
  }

  private async fetchAcquisition(
    registry: TruckRegistryMetrics,
  ): Promise<OwnerAcquisitionMetrics> {
    if (!this.client) throw new Error('FoodTruckBusinessConnector: no client');

    const c = this.client;
    const head = { count: 'exact' as const, head: true };
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const [registrations30d, approvals30d] = await Promise.all([
      c.from('trucks').select('*', head).gte('created_at', thirtyDaysAgo),
      c
        .from('trucks')
        .select('*', head)
        .eq('status', 'approved')
        .gte('updated_at', thirtyDaysAgo),
    ]);

    const activationRate =
      registry.approvedTrucks > 0
        ? Math.round((registry.activeTrucks / registry.approvedTrucks) * 1000) / 10
        : 0;

    return {
      registrationsLast30Days: registrations30d.count ?? 0,
      approvalsLast30Days: approvals30d.count ?? 0,
      activationRate,
    };
  }

  /** Compare last 30d vs prior 30d registrations for onboarding trend. */
  async fetchRegistrationTrend(): Promise<{ current: number; previous: number }> {
    if (!this.client) return { current: 14, previous: 9 };

    const c = this.client;
    const head = { count: 'exact' as const, head: true };
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now - 60 * 24 * 3600 * 1000).toISOString();

    const [current, previous] = await Promise.all([
      c.from('trucks').select('*', head).gte('created_at', thirtyDaysAgo),
      c
        .from('trucks')
        .select('*', head)
        .gte('created_at', sixtyDaysAgo)
        .lt('created_at', thirtyDaysAgo),
    ]);

    return {
      current: current.count ?? 0,
      previous: previous.count ?? 0,
    };
  }
}

function mockFoodTruckBusinessMetrics(): Omit<FoodTruckBusinessMetrics, 'live'> {
  const registry: TruckRegistryMetrics = {
    totalRegisteredTrucks: 45,
    approvedTrucks: 12,
    pendingTrucks: 8,
    rejectedTrucks: 3,
    activeTrucks: 9,
  };
  return {
    registry,
    acquisition: {
      registrationsLast30Days: 14,
      approvalsLast30Days: 6,
      activationRate:
        registry.approvedTrucks > 0
          ? Math.round((registry.activeTrucks / registry.approvedTrucks) * 1000) / 10
          : 0,
    },
    registrationTrend: { current: 14, previous: 9 },
  };
}

export function foodtruckBusinessConnectorFromEnv(): FoodTruckBusinessConnector {
  const url =
    process.env.FOODTRUCK_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const key =
    process.env.FOODTRUCK_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  if (url && key) {
    return new FoodTruckBusinessConnector({ supabaseUrl: url, serviceRoleKey: key });
  }
  return new FoodTruckBusinessConnector();
}

export function buildFoodTruckFunnelSnapshot(registry: TruckRegistryMetrics): FunnelSnapshot {
  return analyzeFunnel(
    FOODTRUCK_FUNNEL_DEFINITION,
    foodTruckRegistryToStageCounts(registry),
  );
}

export { buildFoodTruckDecisionSupport, foodTruckDecisionContextFromMetrics } from './decision-support-adapter';

export function buildOwnerAcquisitionSummary(metrics: FoodTruckBusinessMetrics): string {
  const r = metrics.registry;
  const a = metrics.acquisition;
  const base = `${r.totalRegisteredTrucks} trucks registered. ${r.approvedTrucks} approved. ${r.pendingTrucks} pending review. Activation rate ${a.activationRate}%.`;
  const trend = metrics.registrationTrend;
  const dir =
    trend.current > trend.previous
      ? 'improving'
      : trend.current < trend.previous
        ? 'slowing'
        : 'flat';
  return `${base} Onboarding ${dir} (${trend.current} registrations last 30d vs ${trend.previous} prior period).`;
}
