import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseMetrics } from '@ai-company/shared-types';

export interface SupabasePlatformConnectorConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  /** PostgREST schema, default `ai_company`. */
  schema?: string;
}

/**
 * Supabase platform connector v1 — read-only aggregates from the ai_company schema.
 * No LLM. No writes.
 */
export class SupabasePlatformConnector {
  private readonly client: SupabaseClient | null;
  private readonly schema: string;

  constructor(config?: SupabasePlatformConnectorConfig) {
    this.schema = config?.schema ?? 'ai_company';
    if (config?.supabaseUrl && config?.serviceRoleKey) {
      this.client = createClient(config.supabaseUrl, config.serviceRoleKey, {
        auth: { persistSession: false },
        db: { schema: this.schema },
      }) as SupabaseClient;
    } else {
      this.client = null;
    }
  }

  get live(): boolean {
    return this.client !== null;
  }

  async fetchMetrics(): Promise<SupabaseMetrics> {
    if (!this.client) return mockSupabaseMetrics();

    const since = sevenDaysAgoIso();

    const [projects, risks, metrics, reports, health] = await Promise.all([
      this.client.from('projects').select('id', { count: 'exact', head: true }),
      this.client.from('risks').select('id', { count: 'exact', head: true }),
      this.client
        .from('project_metrics')
        .select('id', { count: 'exact', head: true })
        .gte('timestamp', since),
      this.client
        .from('executive_reports')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
      this.ping(),
    ]);

    const databaseHealthy =
      !projects.error && !risks.error && !metrics.error && !reports.error && health;

    const userCount = projects.count ?? 0;
    const recentActivityCount =
      (metrics.count ?? 0) + (reports.count ?? 0) + (risks.count ?? 0);
    const transactionCount = metrics.count ?? 0;

    return {
      userCount,
      recentActivityCount,
      databaseHealthy,
      transactionCount,
    };
  }

  private async ping(): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.from('projects').select('id').limit(1);
    return !error;
  }
}

function sevenDaysAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

function mockSupabaseMetrics(): SupabaseMetrics {
  return {
    userCount: 4,
    recentActivityCount: 42,
    databaseHealthy: true,
    transactionCount: 28,
  };
}

export function supabasePlatformConnectorFromEnv(): SupabasePlatformConnector {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const schema = process.env.SUPABASE_SCHEMA ?? 'ai_company';
  if (url && key) {
    return new SupabasePlatformConnector({ supabaseUrl: url, serviceRoleKey: key, schema });
  }
  return new SupabasePlatformConnector();
}
