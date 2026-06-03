import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Project,
  ProjectMetric,
  Risk,
  Opportunity,
  ExecutiveReport,
} from '@ai-company/shared-types';
import type { Database } from './generated-types.js';
import type {
  DataSourceRecord,
  DataSourceRepository,
  ExecutiveReportRepository,
  OpportunityRepository,
  ProjectMetricRepository,
  ProjectRepository,
  Repositories,
  RiskRepository,
} from './repositories.js';

type Tables = Database['public']['Tables'];
type ProjectRow = Tables['projects']['Row'];
type MetricRow = Tables['project_metrics']['Row'];
type RiskRow = Tables['risks']['Row'];
type OpportunityRow = Tables['opportunities']['Row'];
type ReportRow = Tables['executive_reports']['Row'];
type DataSourceRow = Tables['data_sources']['Row'];

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMetric(row: MetricRow): ProjectMetric {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.metric_name,
    value: Number(row.metric_value),
    ...(row.unit !== null ? { unit: row.unit } : {}),
    timestamp: row.timestamp,
  };
}

function mapRisk(row: RiskRow): Risk {
  return {
    id: row.id,
    projectId: row.project_id,
    severity: row.severity,
    description: row.description,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapOpportunity(row: OpportunityRow): Opportunity {
  return {
    id: row.id,
    projectId: row.project_id,
    priority: row.priority,
    description: row.description,
    source: row.source,
    createdAt: row.created_at,
  };
}

function mapReport(row: ReportRow): ExecutiveReport {
  return {
    id: row.id,
    executiveId: row.executive_id,
    reportType: row.report_type,
    summary: row.summary,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapDataSource(row: DataSourceRow): DataSourceRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceType: row.source_type,
    status: row.status,
    lastSync: row.last_sync,
    lastError: row.last_error,
  };
}

export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export function createSupabaseRepositories(config: SupabaseConfig): Repositories {
  const client = createClient<Database>(config.url, config.serviceRoleKey, {
    auth: { persistSession: false },
  });

  return {
    projects: new SupabaseProjectRepository(client),
    dataSources: new SupabaseDataSourceRepository(client),
    metrics: new SupabaseProjectMetricRepository(client),
    risks: new SupabaseRiskRepository(client),
    opportunities: new SupabaseOpportunityRepository(client),
    reports: new SupabaseExecutiveReportRepository(client),
  };
}

class SupabaseProjectRepository implements ProjectRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(): Promise<Project[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapProject);
  }

  async getBySlug(slug: string): Promise<Project | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data ? mapProject(data) : null;
  }

  async upsertBySlug(
    input: Pick<Project, 'slug' | 'name' | 'description' | 'status'>,
  ): Promise<Project> {
    const { data, error } = await this.client
      .from('projects')
      .upsert(
        {
          slug: input.slug,
          name: input.name,
          description: input.description,
          status: input.status,
        },
        { onConflict: 'slug' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return mapProject(data);
  }

  async setStatus(id: string, status: Project['status']): Promise<void> {
    const { error } = await this.client.from('projects').update({ status }).eq('id', id);
    if (error) throw error;
  }
}

class SupabaseDataSourceRepository implements DataSourceRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listByProject(projectId: string): Promise<DataSourceRecord[]> {
    const { data, error } = await this.client
      .from('data_sources')
      .select('*')
      .eq('project_id', projectId);
    if (error) throw error;
    return (data ?? []).map(mapDataSource);
  }

  async upsert(input: Parameters<DataSourceRepository['upsert']>[0]): Promise<DataSourceRecord> {
    const { data, error } = await this.client
      .from('data_sources')
      .upsert(
        {
          project_id: input.projectId,
          source_type: input.sourceType,
          status: input.status,
          last_sync: input.lastSync,
          last_error: input.lastError,
        },
        { onConflict: 'project_id,source_type' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return mapDataSource(data);
  }
}

class SupabaseProjectMetricRepository implements ProjectMetricRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listLatestByProject(projectId: string, limitPerName = 1): Promise<ProjectMetric[]> {
    // Pull a window then keep N most-recent per metric_name client-side.
    const { data, error } = await this.client
      .from('project_metrics')
      .select('*')
      .eq('project_id', projectId)
      .order('timestamp', { ascending: false })
      .limit(500);
    if (error) throw error;
    const grouped = new Map<string, ProjectMetric[]>();
    for (const row of data ?? []) {
      const list = grouped.get(row.metric_name) ?? [];
      if (list.length < limitPerName) {
        list.push(mapMetric(row));
        grouped.set(row.metric_name, list);
      }
    }
    return Array.from(grouped.values()).flat();
  }

  async recordMany(metrics: Array<Omit<ProjectMetric, 'id'>>): Promise<ProjectMetric[]> {
    if (metrics.length === 0) return [];
    const { data, error } = await this.client
      .from('project_metrics')
      .insert(
        metrics.map((m) => ({
          project_id: m.projectId,
          metric_name: m.name,
          metric_value: m.value,
          unit: m.unit ?? null,
          timestamp: m.timestamp,
        })),
      )
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapMetric);
  }
}

class SupabaseRiskRepository implements RiskRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listOpen(): Promise<Risk[]> {
    const { data, error } = await this.client.from('risks').select('*').eq('status', 'open');
    if (error) throw error;
    return (data ?? []).map(mapRisk);
  }

  async listByProject(projectId: string, status?: Risk['status']): Promise<Risk[]> {
    let q = this.client.from('risks').select('*').eq('project_id', projectId);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRisk);
  }

  async createMany(risks: Array<Omit<Risk, 'id' | 'createdAt'>>): Promise<Risk[]> {
    if (risks.length === 0) return [];
    const { data, error } = await this.client
      .from('risks')
      .insert(
        risks.map((r) => ({
          project_id: r.projectId,
          severity: r.severity,
          description: r.description,
          source: r.source,
          status: r.status,
        })),
      )
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapRisk);
  }

  async setStatus(id: string, status: Risk['status']): Promise<void> {
    const { error } = await this.client.from('risks').update({ status }).eq('id', id);
    if (error) throw error;
  }
}

class SupabaseOpportunityRepository implements OpportunityRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listAll(): Promise<Opportunity[]> {
    const { data, error } = await this.client.from('opportunities').select('*');
    if (error) throw error;
    return (data ?? []).map(mapOpportunity);
  }

  async listByProject(projectId: string): Promise<Opportunity[]> {
    const { data, error } = await this.client
      .from('opportunities')
      .select('*')
      .eq('project_id', projectId);
    if (error) throw error;
    return (data ?? []).map(mapOpportunity);
  }

  async createMany(
    opportunities: Array<Omit<Opportunity, 'id' | 'createdAt'>>,
  ): Promise<Opportunity[]> {
    if (opportunities.length === 0) return [];
    const { data, error } = await this.client
      .from('opportunities')
      .insert(
        opportunities.map((o) => ({
          project_id: o.projectId,
          priority: o.priority,
          description: o.description,
          source: o.source,
        })),
      )
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapOpportunity);
  }
}

class SupabaseExecutiveReportRepository implements ExecutiveReportRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(
    filter: Parameters<ExecutiveReportRepository['list']>[0] = {},
  ): Promise<ExecutiveReport[]> {
    let q = this.client.from('executive_reports').select('*');
    if (filter.executiveId) q = q.eq('executive_id', filter.executiveId);
    if (filter.reportType) q = q.eq('report_type', filter.reportType);
    q = q.order('created_at', { ascending: false }).limit(filter.limit ?? 50);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapReport);
  }

  async getById(id: string): Promise<ExecutiveReport | null> {
    const { data, error } = await this.client
      .from('executive_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapReport(data) : null;
  }

  async latest(executiveId: string, reportType: ExecutiveReport['reportType']): Promise<
    ExecutiveReport | null
  > {
    const { data, error } = await this.client
      .from('executive_reports')
      .select('*')
      .eq('executive_id', executiveId)
      .eq('report_type', reportType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapReport(data) : null;
  }

  async create(input: Omit<ExecutiveReport, 'id' | 'createdAt'>): Promise<ExecutiveReport> {
    const { data, error } = await this.client
      .from('executive_reports')
      .insert({
        executive_id: input.executiveId,
        report_type: input.reportType,
        summary: input.summary,
        body: input.body,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapReport(data);
  }
}
