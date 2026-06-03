import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RevenueMetrics, RevenueSnapshot } from '@ai-company/shared-types';
import type { RevenueConnector, RevenueSourceConfig } from './types';

/**
 * FoodTruck-IL live revenue: real truck_events volume in the reporting window.
 * Amounts use registry-configured unit economics (visibility until payments table exists).
 */
export class FoodTruckRevenueConnector implements RevenueConnector {
  readonly live: boolean;

  constructor(
    readonly projectId: string,
    readonly projectName: string,
    private readonly client: SupabaseClient | null,
    private readonly config: RevenueSourceConfig,
  ) {
    this.live = this.client !== null;
  }

  async getRevenueSnapshot(): Promise<RevenueSnapshot> {
    if (!this.client) {
      return mockFoodTruckSnapshot(this.projectId, this.projectName, this.config);
    }

    const days = this.config.reportingDays ?? 30;
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    const currency = (this.config.currency ?? 'ILS').toUpperCase();
    const avgTx = this.config.avgTransactionValue ?? 329;
    const monthlyFee = this.config.monthlySubscriptionFee ?? 199;

    const c = this.client;
    const head = { count: 'exact' as const, head: true };

    const [events, approved] = await Promise.all([
      c.from('truck_events').select('*', head).gte('created_at', since),
      c.from('trucks').select('*', head).eq('status', 'approved'),
    ]);

    const transactionCount = events.count ?? 0;
    const approvedCount = approved.count ?? 0;
    const oneTimeRevenue = transactionCount * avgTx;
    const recurringRevenue = approvedCount * monthlyFee;
    const totalRevenue = oneTimeRevenue + recurringRevenue;
    const averageTransactionValue =
      transactionCount > 0
        ? Math.round((oneTimeRevenue / transactionCount) * 100) / 100
        : 0;

    const metrics: RevenueMetrics = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      recurringRevenue: Math.round(recurringRevenue * 100) / 100,
      transactionCount,
      averageTransactionValue,
      currency,
    };

    return {
      projectId: this.projectId,
      projectName: this.projectName,
      metrics,
      live: true,
      capturedAt: new Date().toISOString(),
    };
  }
}

export function createFoodTruckRevenueConnector(params: {
  projectId: string;
  projectName: string;
  config: RevenueSourceConfig;
}): FoodTruckRevenueConnector {
  const url =
    process.env.FOODTRUCK_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const key =
    process.env.FOODTRUCK_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  const client =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false },
          db: { schema: 'public' },
        })
      : null;
  return new FoodTruckRevenueConnector(
    params.projectId,
    params.projectName,
    client,
    params.config,
  );
}

function mockFoodTruckSnapshot(
  projectId: string,
  projectName: string,
  config: RevenueSourceConfig,
): RevenueSnapshot {
  const transactionCount = config.transactionCount ?? 38;
  const totalRevenue = config.totalRevenue ?? 12500;
  const recurringRevenue = config.recurringRevenue ?? 2189;
  const currency = (config.currency ?? 'ILS').toUpperCase();
  return {
    projectId,
    projectName,
    metrics: {
      totalRevenue,
      recurringRevenue,
      transactionCount,
      averageTransactionValue:
        transactionCount > 0
          ? Math.round((totalRevenue / transactionCount) * 100) / 100
          : 0,
      currency,
    },
    live: false,
    capturedAt: new Date().toISOString(),
  };
}
