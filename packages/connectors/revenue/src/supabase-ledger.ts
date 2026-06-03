import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RevenueMetrics, RevenueSnapshot } from '@ai-company/shared-types';
import type { RevenueConnector, RevenueSourceConfig } from './types';

type LedgerRow = {
  amount: number;
  currency: string;
  is_recurring: boolean;
};

export class SupabaseLedgerRevenueConnector implements RevenueConnector {
  readonly live: boolean;

  constructor(
    readonly projectId: string,
    readonly projectName: string,
    private readonly client: SupabaseClient<Record<string, unknown>>,
    private readonly config: RevenueSourceConfig,
  ) {
    this.live = true;
  }

  async getRevenueSnapshot(): Promise<RevenueSnapshot> {
    const days = this.config.reportingDays ?? 30;
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    const currency = (this.config.currency ?? 'ILS').toUpperCase();

    const { data, error } = await this.client
      .from('revenue_transactions')
      .select('amount, currency, is_recurring')
      .eq('project_slug', this.projectId)
      .gte('occurred_at', since);

    if (error) throw new Error(`SupabaseLedgerRevenueConnector: ${error.message}`);

    const rows = (data ?? []) as LedgerRow[];
    const metrics = aggregateLedgerRows(rows, currency);
    return buildSnapshot(this.projectId, this.projectName, metrics, this.live);
  }
}

export function createSupabaseLedgerConnector(params: {
  projectId: string;
  projectName: string;
  supabaseUrl: string;
  serviceRoleKey: string;
  schema?: string;
  config: RevenueSourceConfig;
}): SupabaseLedgerRevenueConnector | null {
  if (!params.supabaseUrl || !params.serviceRoleKey) return null;
  const client = createClient(params.supabaseUrl, params.serviceRoleKey, {
    auth: { persistSession: false },
    db: { schema: params.schema ?? 'ai_company' },
  }) as SupabaseClient<Record<string, unknown>>;
  return new SupabaseLedgerRevenueConnector(
    params.projectId,
    params.projectName,
    client,
    params.config,
  );
}

function aggregateLedgerRows(rows: LedgerRow[], fallbackCurrency: string): RevenueMetrics {
  let totalRevenue = 0;
  let recurringRevenue = 0;
  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    totalRevenue += amount;
    if (row.is_recurring) recurringRevenue += amount;
  }
  const transactionCount = rows.length;
  const averageTransactionValue =
    transactionCount > 0 ? Math.round((totalRevenue / transactionCount) * 100) / 100 : 0;
  const currency = rows[0]?.currency?.toUpperCase() ?? fallbackCurrency;
  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    recurringRevenue: Math.round(recurringRevenue * 100) / 100,
    transactionCount,
    averageTransactionValue,
    currency,
  };
}

function buildSnapshot(
  projectId: string,
  projectName: string,
  metrics: RevenueMetrics,
  live: boolean,
): RevenueSnapshot {
  return {
    projectId,
    projectName,
    metrics,
    live,
    capturedAt: new Date().toISOString(),
  };
}
