import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Untyped client — custom `ai_company` schema is not in generated Database yet. */
type RepoClient = SupabaseClient;
import type {
  CreateEvidenceTokenInput,
  CreateObjectiveInput,
  CreateOutcomeInput,
  CreateProjectInput,
  CreateTaskInput,
  CreateTaskOutcomeInput,
  DecideTaskProposalInput,
  DirectiveResponseRecord,
  DirectiveResponseStatus,
  EnqueueDirectiveResponseInput,
  EvidenceRequirementSchema,
  EvidenceToken,
  ExecutiveReport,
  Objective,
  ObjectiveOutcome,
  ObjectiveStatus,
  Opportunity,
  OutcomeDirection,
  OutcomeSource,
  Project,
  ProjectMetric,
  ProposalStatus,
  ProposalType,
  Risk,
  Task,
  TaskOutcome,
  TaskProposal,
  TaskProposalRecord,
  TaskStatus,
  UpdateDirectiveResponseInput,
  UpdateObjectiveInput,
  UpdateOutcomeMeasurementInput,
  UpdateProjectBySlugInput,
  UpdateTaskInput,
  UpsertTaskProposalInput,
} from '@ai-company/shared-types';
import {
  type DataSourceRecord,
  type CreateExecutiveReportInput,
  type DataSourceRepository,
  type DirectiveResponseRepository,
  EmptyRecordedByError,
  type EvidenceTokenRepository,
  type ExecutiveReportRepository,
  InvalidOutcomeInputError,
  InvalidProjectInputError,
  type ObjectiveOutcomeRepository,
  type ObjectiveRepository,
  type OpportunityRepository,
  ProjectAlreadyExistsError,
  ProjectNotFoundError,
  type ProjectMetricRepository,
  type ProjectRepository,
  type Repositories,
  type RiskRepository,
  type TaskOutcomeRepository,
  type TaskProposalRepository,
  type TaskRepository,
} from './repositories';

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: Project['status'];
  created_at: string;
  updated_at: string;
  created_by: string;
};
type MetricRow = {
  id: string;
  project_id: string;
  metric_name: string;
  metric_value: number;
  unit: string | null;
  timestamp: string;
  recorded_by: string;
};
type RiskRow = {
  id: string;
  project_id: string;
  severity: Risk['severity'];
  description: string;
  source: string;
  status: Risk['status'];
  created_at: string;
  recorded_by: string;
  fingerprint: string;
  generation: number;
};
type OpportunityRow = {
  id: string;
  project_id: string;
  priority: Opportunity['priority'];
  description: string;
  source: string;
  created_at: string;
  recorded_by: string;
  fingerprint: string;
  generation: number;
};
type ReportRow = {
  id: string;
  executive_id: string;
  report_type: ExecutiveReport['reportType'];
  summary: string;
  body: unknown;
  created_at: string;
  source_directive_id: string | null;
};
type DataSourceRow = {
  id: string;
  project_id: string;
  source_type: string;
  status: DataSourceRecord['status'];
  last_sync: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
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
    recordedBy: row.recorded_by,
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
    recordedBy: row.recorded_by,
    fingerprint: row.fingerprint,
    generation: row.generation,
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
    recordedBy: row.recorded_by,
    fingerprint: row.fingerprint,
    generation: row.generation,
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
    sourceDirectiveId: row.source_directive_id,
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
  /**
   * Postgres schema PostgREST should route all queries through.
   * Defaults to `ai_company` so the platform's tables stay namespaced
   * inside a Supabase project that may host another app in `public`.
   */
  schema?: string;
}

export function createSupabaseRepositories(config: SupabaseConfig): Repositories {
  const client = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false },
    db: { schema: config.schema ?? 'ai_company' },
  }) as RepoClient;

  return {
    projects: new SupabaseProjectRepository(client),
    dataSources: new SupabaseDataSourceRepository(client),
    metrics: new SupabaseProjectMetricRepository(client),
    risks: new SupabaseRiskRepository(client),
    opportunities: new SupabaseOpportunityRepository(client),
    reports: new SupabaseExecutiveReportRepository(client),
    directiveResponses: new SupabaseDirectiveResponseRepository(client),
    objectives: new SupabaseObjectiveRepository(client),
    objectiveOutcomes: new SupabaseObjectiveOutcomeRepository(client),
    tasks: new SupabaseTaskRepository(client),
    evidenceTokens: new SupabaseEvidenceTokenRepository(client),
    taskProposals: new SupabaseTaskProposalRepository(client),
    taskOutcomes: new SupabaseTaskOutcomeRepository(client),
  };
}

class SupabaseProjectRepository implements ProjectRepository {
  constructor(private readonly client: RepoClient) {}

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

  async create(input: CreateProjectInput): Promise<Project> {
    if (!input.createdBy || !input.createdBy.trim()) {
      throw new InvalidProjectInputError('createdBy must be a non-empty string');
    }
    const existing = await this.getBySlug(input.slug);
    if (existing) throw new ProjectAlreadyExistsError(input.slug);
    const { data, error } = await this.client
      .from('projects')
      .insert({
        slug: input.slug,
        name: input.name,
        description: input.description,
        status: input.status,
        created_by: input.createdBy.trim(),
      })
      .select('*')
      .single();
    if (error) {
      // Race: another writer created the row between our existence check and
      // the insert. Map Postgres unique-violation to the doctrine error so
      // callers handle it the same way.
      // 23505 = unique_violation
      const pgErr = error as { code?: string };
      if (pgErr.code === '23505') throw new ProjectAlreadyExistsError(input.slug);
      throw error;
    }
    return mapProject(data);
  }

  async updateBySlug(
    slug: string,
    patch: UpdateProjectBySlugInput,
  ): Promise<Project> {
    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.status !== undefined) payload.status = patch.status;
    if (Object.keys(payload).length === 0) {
      const existing = await this.getBySlug(slug);
      if (!existing) throw new ProjectNotFoundError(slug);
      return existing;
    }
    const { data, error } = await this.client
      .from('projects')
      .update(payload)
      .eq('slug', slug)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ProjectNotFoundError(slug);
    return mapProject(data);
  }

  async setStatus(id: string, status: Project['status']): Promise<void> {
    const { error } = await this.client.from('projects').update({ status }).eq('id', id);
    if (error) throw error;
  }
}

class SupabaseDataSourceRepository implements DataSourceRepository {
  constructor(private readonly client: RepoClient) {}

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
  constructor(private readonly client: RepoClient) {}

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
    // P006A — recordedBy is required, non-empty. Append-only (no upsert)
    // because metrics are a time series — every reading is a snapshot.
    for (const m of metrics) {
      if (!m.recordedBy || !m.recordedBy.trim()) {
        throw new Error('metrics.recordMany: every metric requires non-empty recordedBy');
      }
    }
    const { data, error } = await this.client
      .from('project_metrics')
      .insert(
        metrics.map((m) => ({
          project_id: m.projectId,
          metric_name: m.name,
          metric_value: m.value,
          unit: m.unit ?? null,
          timestamp: m.timestamp,
          recorded_by: m.recordedBy.trim(),
        })),
      )
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapMetric);
  }
}

class SupabaseRiskRepository implements RiskRepository {
  constructor(private readonly client: RepoClient) {}

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
    // P006A — fingerprint-based upsert: same risk re-detected bumps generation,
    // does NOT create a duplicate row. Caller must supply recordedBy + fingerprint.
    for (const r of risks) {
      if (!r.recordedBy || !r.recordedBy.trim()) {
        throw new Error('risks.createMany: every risk requires non-empty recordedBy');
      }
      if (!r.fingerprint || !r.fingerprint.trim()) {
        throw new Error('risks.createMany: every risk requires fingerprint');
      }
    }
    const out: Risk[] = [];
    // PostgREST upsert: returning bumped generation requires a server-side
    // expression, which postgrest doesn't support. Do read-then-write per
    // row — the volumes here are small (single-digit per sync per project).
    for (const r of risks) {
      const existing = await this.client
        .from('risks')
        .select('*')
        .eq('project_id', r.projectId)
        .eq('fingerprint', r.fingerprint)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) {
        const next = (existing.data as RiskRow).generation + 1;
        const upd = await this.client
          .from('risks')
          .update({
            generation: next,
            // Keep description/severity stable from existing — re-detection
            // is the same fact, not new content. recordedBy is in fingerprint.
            // Status MAY have been moved by an operator since first detection;
            // preserve operator state on bump.
          })
          .eq('id', (existing.data as RiskRow).id)
          .select('*')
          .single();
        if (upd.error) throw upd.error;
        out.push(mapRisk(upd.data as RiskRow));
        continue;
      }
      const ins = await this.client
        .from('risks')
        .insert({
          project_id: r.projectId,
          severity: r.severity,
          description: r.description,
          source: r.source,
          status: r.status,
          recorded_by: r.recordedBy.trim(),
          fingerprint: r.fingerprint,
        })
        .select('*')
        .single();
      if (ins.error) throw ins.error;
      out.push(mapRisk(ins.data as RiskRow));
    }
    return out;
  }

  async setStatus(id: string, status: Risk['status']): Promise<void> {
    const { error } = await this.client.from('risks').update({ status }).eq('id', id);
    if (error) throw error;
  }
}

class SupabaseOpportunityRepository implements OpportunityRepository {
  constructor(private readonly client: RepoClient) {}

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
    for (const o of opportunities) {
      if (!o.recordedBy || !o.recordedBy.trim()) {
        throw new Error('opportunities.createMany: every opportunity requires non-empty recordedBy');
      }
      if (!o.fingerprint || !o.fingerprint.trim()) {
        throw new Error('opportunities.createMany: every opportunity requires fingerprint');
      }
    }
    const out: Opportunity[] = [];
    for (const o of opportunities) {
      const existing = await this.client
        .from('opportunities')
        .select('*')
        .eq('project_id', o.projectId)
        .eq('fingerprint', o.fingerprint)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) {
        const next = (existing.data as OpportunityRow).generation + 1;
        const upd = await this.client
          .from('opportunities')
          .update({ generation: next })
          .eq('id', (existing.data as OpportunityRow).id)
          .select('*')
          .single();
        if (upd.error) throw upd.error;
        out.push(mapOpportunity(upd.data as OpportunityRow));
        continue;
      }
      const ins = await this.client
        .from('opportunities')
        .insert({
          project_id: o.projectId,
          priority: o.priority,
          description: o.description,
          source: o.source,
          recorded_by: o.recordedBy.trim(),
          fingerprint: o.fingerprint,
        })
        .select('*')
        .single();
      if (ins.error) throw ins.error;
      out.push(mapOpportunity(ins.data as OpportunityRow));
    }
    return out;
  }
}

class SupabaseExecutiveReportRepository implements ExecutiveReportRepository {
  constructor(private readonly client: RepoClient) {}

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

  async create(
    input: CreateExecutiveReportInput,
  ): Promise<ExecutiveReport> {
    const { data, error } = await this.client
      .from('executive_reports')
      .insert({
        executive_id: input.executiveId,
        report_type: input.reportType,
        summary: input.summary,
        body: input.body,
        source_directive_id: input.sourceDirectiveId ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapReport(data);
  }

  async listByDirective(directiveId: string): Promise<ExecutiveReport[]> {
    const { data, error } = await this.client
      .from('executive_reports')
      .select('*')
      .eq('source_directive_id', directiveId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapReport);
  }
}

type DirectiveResponseRow = {
  id: string;
  directive_id: string;
  executive_id: string;
  status: DirectiveResponseStatus;
  executive_report_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

function mapDirectiveResponse(row: DirectiveResponseRow): DirectiveResponseRecord {
  return {
    id: row.id,
    directiveId: row.directive_id,
    executiveId: row.executive_id,
    status: row.status,
    executiveReportId: row.executive_report_id,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class SupabaseDirectiveResponseRepository implements DirectiveResponseRepository {
  constructor(private readonly client: RepoClient) {}

  async listByDirective(directiveId: string): Promise<DirectiveResponseRecord[]> {
    const { data, error } = await this.client
      .from('directive_responses')
      .select('*')
      .eq('directive_id', directiveId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapDirectiveResponse);
  }

  async listByDirectiveAndStatus(
    directiveId: string,
    status: DirectiveResponseStatus,
  ): Promise<DirectiveResponseRecord[]> {
    const { data, error } = await this.client
      .from('directive_responses')
      .select('*')
      .eq('directive_id', directiveId)
      .eq('status', status)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapDirectiveResponse);
  }

  async enqueue(
    inputs: EnqueueDirectiveResponseInput[],
  ): Promise<DirectiveResponseRecord[]> {
    if (inputs.length === 0) return [];
    // Re-running a directive: existing (directive, executive) rows get their
    // status reset to 'pending' and any prior report/error cleared, so the
    // worker treats them as fresh work. New rows are inserted.
    const rows = inputs.map((i) => ({
      directive_id: i.directiveId,
      executive_id: i.executiveId,
      status: 'pending' as DirectiveResponseStatus,
      executive_report_id: null,
      error_message: null,
    }));
    const { data, error } = await this.client
      .from('directive_responses')
      .upsert(rows, { onConflict: 'directive_id,executive_id' })
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapDirectiveResponse);
  }

  async update(
    id: string,
    input: UpdateDirectiveResponseInput,
  ): Promise<DirectiveResponseRecord> {
    const patch: Record<string, unknown> = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.executiveReportId !== undefined)
      patch.executive_report_id = input.executiveReportId;
    if (input.errorMessage !== undefined) patch.error_message = input.errorMessage;
    const { data, error } = await this.client
      .from('directive_responses')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapDirectiveResponse(data as DirectiveResponseRow);
  }
}

// ---------- DOOS Phase 1A ----------

type ObjectiveRow = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: ObjectiveStatus;
  target_outcome_summary: string | null;
};

function mapObjective(r: ObjectiveRow): Objective {
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    title: r.title,
    description: r.description,
    ownerId: r.owner_id,
    status: r.status,
    targetOutcomeSummary: r.target_outcome_summary,
  };
}

class SupabaseObjectiveRepository implements ObjectiveRepository {
  constructor(private readonly client: RepoClient) {}
  async list(filter?: { status?: ObjectiveStatus }): Promise<Objective[]> {
    let q = this.client.from('objectives').select('*').order('created_at', { ascending: false });
    if (filter?.status) q = q.eq('status', filter.status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapObjective);
  }
  async getById(id: string): Promise<Objective | null> {
    const { data, error } = await this.client.from('objectives').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapObjective(data) : null;
  }
  async create(input: CreateObjectiveInput): Promise<Objective> {
    const row = {
      title: input.title,
      description: input.description ?? null,
      owner_id: input.ownerId ?? null,
      status: input.status ?? 'draft',
      target_outcome_summary: input.targetOutcomeSummary ?? null,
    };
    const { data, error } = await this.client.from('objectives').insert(row).select('*').single();
    if (error) throw error;
    return mapObjective(data);
  }
  async update(id: string, input: UpdateObjectiveInput): Promise<Objective> {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.ownerId !== undefined) patch.owner_id = input.ownerId;
    if (input.status !== undefined) patch.status = input.status;
    if (input.targetOutcomeSummary !== undefined) patch.target_outcome_summary = input.targetOutcomeSummary;
    const { data, error } = await this.client.from('objectives').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return mapObjective(data);
  }
  async countByStatus(status: ObjectiveStatus): Promise<number> {
    const { count, error } = await this.client.from('objectives').select('*', { count: 'exact', head: true }).eq('status', status);
    if (error) throw error;
    return count ?? 0;
  }
}

type OutcomeRow = {
  id: string;
  objective_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  metric_unit: string | null;
  baseline_value: number | null;
  target_value: number | null;
  current_value: number | null;
  measurement_source: ObjectiveOutcome['measurementSource'];
  status: ObjectiveOutcome['status'];
  last_measured_at: string | null;
};

function mapOutcome(r: OutcomeRow): ObjectiveOutcome {
  return {
    id: r.id,
    objectiveId: r.objective_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    name: r.name,
    metricUnit: r.metric_unit,
    baselineValue: r.baseline_value === null ? null : Number(r.baseline_value),
    targetValue: r.target_value === null ? null : Number(r.target_value),
    currentValue: r.current_value === null ? null : Number(r.current_value),
    measurementSource: r.measurement_source,
    status: r.status,
    lastMeasuredAt: r.last_measured_at,
  };
}

class SupabaseObjectiveOutcomeRepository implements ObjectiveOutcomeRepository {
  constructor(private readonly client: RepoClient) {}
  async listByObjective(objectiveId: string): Promise<ObjectiveOutcome[]> {
    const { data, error } = await this.client.from('objective_outcomes').select('*').eq('objective_id', objectiveId).order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapOutcome);
  }
  async getById(id: string): Promise<ObjectiveOutcome | null> {
    const { data, error } = await this.client.from('objective_outcomes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapOutcome(data) : null;
  }
  async create(input: CreateOutcomeInput): Promise<ObjectiveOutcome> {
    const row = {
      objective_id: input.objectiveId,
      name: input.name,
      metric_unit: input.metricUnit ?? null,
      baseline_value: input.baselineValue ?? null,
      target_value: input.targetValue ?? null,
      current_value: input.currentValue ?? null,
      measurement_source: input.measurementSource ?? 'manual',
    };
    const { data, error } = await this.client.from('objective_outcomes').insert(row).select('*').single();
    if (error) throw error;
    return mapOutcome(data);
  }
  async updateMeasurement(id: string, input: UpdateOutcomeMeasurementInput): Promise<ObjectiveOutcome> {
    const measured = input.measuredAt ?? new Date().toISOString();
    const { data, error } = await this.client.from('objective_outcomes').update({
      current_value: input.currentValue,
      last_measured_at: measured,
    }).eq('id', id).select('*').single();
    if (error) throw error;
    const row = mapOutcome(data);
    // Auto-flip to 'achieved' if currentValue crosses targetValue in the right direction.
    if (row.targetValue !== null && row.baselineValue !== null && row.currentValue !== null && row.status !== 'achieved') {
      const targetReached =
        row.targetValue > row.baselineValue
          ? row.currentValue >= row.targetValue
          : row.currentValue <= row.targetValue;
      if (targetReached) {
        return this.setStatus(id, 'achieved');
      }
    }
    return row;
  }
  async setStatus(id: string, status: ObjectiveOutcome['status']): Promise<ObjectiveOutcome> {
    const { data, error } = await this.client.from('objective_outcomes').update({ status }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapOutcome(data);
  }
}

type TaskRow = {
  id: string;
  created_at: string;
  updated_at: string;
  objective_id: string;
  directive_id: string | null;
  title: string;
  description: string | null;
  capability_required: string;
  owner_id: string | null;
  status: TaskStatus;
  evidence_required: EvidenceRequirementSchema;
  due_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  proposal_id: string | null;
};

function mapTask(r: TaskRow): Task {
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    objectiveId: r.objective_id,
    directiveId: r.directive_id,
    title: r.title,
    description: r.description,
    capabilityRequired: r.capability_required,
    ownerId: r.owner_id,
    status: r.status,
    evidenceRequired: r.evidence_required,
    dueAt: r.due_at,
    completedAt: r.completed_at,
    completedBy: r.completed_by,
    proposalId: r.proposal_id ?? null,
  };
}

const DEFAULT_EVIDENCE_REQUIRED: EvidenceRequirementSchema = {
  minTier: 'E2',
  requiredKinds: [],
  minCount: 1,
};

class SupabaseTaskRepository implements TaskRepository {
  constructor(private readonly client: RepoClient) {}
  async list(filter?: { objectiveId?: string; directiveId?: string; ownerId?: string; status?: TaskStatus }): Promise<Task[]> {
    let q = this.client.from('tasks').select('*').order('created_at', { ascending: false });
    if (filter?.objectiveId) q = q.eq('objective_id', filter.objectiveId);
    if (filter?.directiveId) q = q.eq('directive_id', filter.directiveId);
    if (filter?.ownerId) q = q.eq('owner_id', filter.ownerId);
    if (filter?.status) q = q.eq('status', filter.status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapTask);
  }
  async getById(id: string): Promise<Task | null> {
    const { data, error } = await this.client.from('tasks').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTask(data) : null;
  }
  async create(input: CreateTaskInput): Promise<Task> {
    const row = {
      objective_id: input.objectiveId,
      directive_id: input.directiveId ?? null,
      title: input.title,
      description: input.description ?? null,
      capability_required: input.capabilityRequired,
      owner_id: input.ownerId ?? null,
      evidence_required: input.evidenceRequired ?? DEFAULT_EVIDENCE_REQUIRED,
      due_at: input.dueAt ?? null,
      proposal_id: input.proposalId ?? null,
    };
    const { data, error } = await this.client.from('tasks').insert(row).select('*').single();
    if (error) throw error;
    return mapTask(data);
  }
  async updateMeta(id: string, input: UpdateTaskInput): Promise<Task> {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.ownerId !== undefined) patch.owner_id = input.ownerId;
    if (input.evidenceRequired !== undefined) patch.evidence_required = input.evidenceRequired;
    if (input.dueAt !== undefined) patch.due_at = input.dueAt;
    const { data, error } = await this.client.from('tasks').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTask(data);
  }
  async setStatus(id: string, status: TaskStatus, transition?: { completedBy?: string }): Promise<Task> {
    const patch: Record<string, unknown> = { status };
    if (status === 'completed' && transition?.completedBy) patch.completed_by = transition.completedBy;
    const { data, error } = await this.client.from('tasks').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTask(data);
  }
}

type EvidenceTokenRow = {
  id: string;
  task_id: string;
  created_at: string;
  created_by: string;
  tier: EvidenceToken['tier'];
  kind: string;
  payload: Record<string, unknown>;
  signed_by: string | null;
  override_reason: string | null;
  approved_by: string | null;
  verified_at: string | null;
  validator_version: string | null;
  source_kind: EvidenceToken['sourceKind'];
  source_ref: string | null;
  evidence_kind: EvidenceToken['evidenceKind'];
  evidence_hash: string | null;
};

function mapEvidence(r: EvidenceTokenRow): EvidenceToken {
  const base = {
    id: r.id,
    taskId: r.task_id,
    createdAt: r.created_at,
    createdBy: r.created_by,
    kind: r.kind,
    payload: r.payload,
    signedBy: r.signed_by,
    verifiedAt: r.verified_at,
    validatorVersion: r.validator_version,
    sourceKind: r.source_kind,
    sourceRef: r.source_ref,
    evidenceKind: r.evidence_kind,
    evidenceHash: r.evidence_hash,
  };
  if (r.tier === 'E1') {
    return {
      ...base,
      tier: 'E1',
      evidenceKind: 'human_attestation',
      overrideReason: r.override_reason ?? '',
      approvedBy: r.approved_by ?? '',
    } as EvidenceToken;
  }
  return {
    ...base,
    tier: r.tier,
    overrideReason: null,
    approvedBy: null,
  } as EvidenceToken;
}

/**
 * P007 — kind→tier table (mirrored from shared-types EVIDENCE_KIND_TIER and
 * doos-core completion-gate KIND_TIER; see those for the doctrine note).
 * Kept inline here so the database package has no runtime value import from
 * either package — keeps the cross-package resolution chain clean.
 */
const KIND_TIER: Record<EvidenceToken['evidenceKind'], EvidenceToken['tier']> = {
  manual_note: 'E0',
  other: 'E0',
  human_attestation: 'E1',
  screenshot: 'E2',
  meeting_held: 'E2',
  document_produced: 'E2',
  message_sent: 'E3',
  metric_snapshot: 'E4',
};

class SupabaseEvidenceTokenRepository implements EvidenceTokenRepository {
  constructor(private readonly client: RepoClient) {}
  async listByTask(taskId: string): Promise<EvidenceToken[]> {
    const { data, error } = await this.client
      .from('evidence_tokens')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapEvidence);
  }
  async create(taskId: string, input: CreateEvidenceTokenInput): Promise<EvidenceToken> {
    // P007 — provenance + payload floor. Createdby must be non-empty;
    // evidenceKind is required; tier is derived from kind (never accepted
    // from caller); human_attestation requires both override fields.
    if (!input.createdBy || !input.createdBy.trim()) {
      throw new Error('createdBy must be a non-empty string');
    }
    if (!input.evidenceKind) {
      throw new Error('evidenceKind is required');
    }
    const tier = KIND_TIER[input.evidenceKind];
    if (!tier) {
      throw new Error(`unknown evidenceKind: ${String(input.evidenceKind)}`);
    }
    const isAttestation = input.evidenceKind === 'human_attestation';
    if (isAttestation) {
      if (!input.overrideReason || !input.overrideReason.trim())
        throw new Error('human_attestation requires overrideReason');
      if (!input.approvedBy || !input.approvedBy.trim())
        throw new Error('human_attestation requires approvedBy');
    }

    const row: Record<string, unknown> = {
      task_id: taskId,
      created_by: input.createdBy.trim(),
      tier,
      kind: input.kind ?? input.evidenceKind,
      payload: input.payload ?? {},
      signed_by: input.signedBy ?? null,
      override_reason: isAttestation ? input.overrideReason! : null,
      approved_by: isAttestation ? input.approvedBy! : null,
      source_kind: input.sourceKind,
      source_ref: input.sourceRef ?? null,
      evidence_kind: input.evidenceKind,
      evidence_hash: input.evidenceHash ?? null,
    };
    const { data, error } = await this.client
      .from('evidence_tokens')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    return mapEvidence(data);
  }
  async markVerified(id: string, validatorVersion: string): Promise<EvidenceToken> {
    const { data, error } = await this.client
      .from('evidence_tokens')
      .update({
        verified_at: new Date().toISOString(),
        validator_version: validatorVersion,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapEvidence(data);
  }
}

// P005A — task_proposals.

type TaskProposalRow = {
  id: string;
  created_at: string;
  updated_at: string;
  directive_id: string;
  source_executive_id: string;
  proposal_type: ProposalType;
  fingerprint: string;
  payload: TaskProposal;
  status: ProposalStatus;
  generation: number;
  decided_at: string | null;
  decided_by: string | null;
};

function mapTaskProposal(r: TaskProposalRow): TaskProposalRecord {
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    directiveId: r.directive_id,
    sourceExecutiveId: r.source_executive_id,
    proposalType: r.proposal_type,
    fingerprint: r.fingerprint,
    payload: r.payload,
    status: r.status,
    generation: r.generation,
    decidedAt: r.decided_at,
    decidedBy: r.decided_by,
  };
}

class SupabaseTaskProposalRepository implements TaskProposalRepository {
  constructor(private readonly client: RepoClient) {}
  async listByDirective(directiveId: string): Promise<TaskProposalRecord[]> {
    const { data, error } = await this.client
      .from('task_proposals')
      .select('*')
      .eq('directive_id', directiveId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTaskProposal);
  }
  async listByStatus(status: ProposalStatus): Promise<TaskProposalRecord[]> {
    const { data, error } = await this.client
      .from('task_proposals')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapTaskProposal);
  }
  async getById(id: string): Promise<TaskProposalRecord | null> {
    const { data, error } = await this.client
      .from('task_proposals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapTaskProposal(data) : null;
  }
  async upsert(input: UpsertTaskProposalInput): Promise<TaskProposalRecord> {
    // PostgREST upsert with on_conflict on the unique (directive_id, fingerprint).
    // We can't easily atomically bump `generation` via PostgREST; emulate with
    // a SELECT-then-INSERT/UPDATE round-trip. The unique index is still the DB
    // floor — a concurrent insert would error, which is acceptable since the
    // fan-out is single-threaded per (directive, executive) pair.
    const existing = await this.client
      .from('task_proposals')
      .select('*')
      .eq('directive_id', input.directiveId)
      .eq('fingerprint', input.fingerprint)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      const next = (existing.data as TaskProposalRow).generation + 1;
      const upd = await this.client
        .from('task_proposals')
        .update({
          generation: next,
          payload: input.payload,
          proposal_type: input.proposalType,
          source_executive_id: input.sourceExecutiveId,
        })
        .eq('id', (existing.data as TaskProposalRow).id)
        .select('*')
        .single();
      if (upd.error) throw upd.error;
      return mapTaskProposal(upd.data as TaskProposalRow);
    }
    const ins = await this.client
      .from('task_proposals')
      .insert({
        directive_id: input.directiveId,
        source_executive_id: input.sourceExecutiveId,
        proposal_type: input.proposalType,
        fingerprint: input.fingerprint,
        payload: input.payload,
        status: 'proposed',
        generation: 1,
      })
      .select('*')
      .single();
    if (ins.error) throw ins.error;
    return mapTaskProposal(ins.data as TaskProposalRow);
  }
  async decide(
    id: string,
    input: DecideTaskProposalInput,
  ): Promise<TaskProposalRecord> {
    const { data, error } = await this.client
      .from('task_proposals')
      .update({
        status: input.status,
        decided_at: new Date().toISOString(),
        decided_by: input.decidedBy,
      })
      .eq('id', id)
      .eq('status', 'proposed')
      .select('*')
      .single();
    if (error) throw error;
    if (!data) {
      throw new Error(`task_proposal ${id} could not be decided (already decided or missing)`);
    }
    return mapTaskProposal(data as TaskProposalRow);
  }
}

// P008 — task_outcomes (append-only).

type TaskOutcomeRow = {
  id: string;
  created_at: string;
  updated_at: string;
  task_id: string;
  metric_name: string;
  metric_unit: string | null;
  baseline_value: string | number;
  observed_value: string | number;
  delta: string | number;
  direction: OutcomeDirection;
  observed_at: string;
  window_start: string;
  window_end: string;
  source: OutcomeSource;
  source_ref: string | null;
  recorded_by: string;
  notes: string | null;
};

/**
 * Postgres NUMERIC columns may come back as strings from postgrest. Coerce
 * once at the boundary so the rest of the codebase sees `number`. NaN here
 * would itself be a contract violation — the DB shouldn't have written it.
 */
function toNumber(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`unexpected non-finite numeric from DB: ${String(value)}`);
  }
  return n;
}

function mapTaskOutcome(r: TaskOutcomeRow): TaskOutcome {
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    taskId: r.task_id,
    metricName: r.metric_name,
    metricUnit: r.metric_unit,
    baselineValue: toNumber(r.baseline_value),
    observedValue: toNumber(r.observed_value),
    delta: toNumber(r.delta),
    direction: r.direction,
    observedAt: r.observed_at,
    windowStart: r.window_start,
    windowEnd: r.window_end,
    source: r.source,
    sourceRef: r.source_ref,
    recordedBy: r.recorded_by,
    notes: r.notes,
  };
}

class SupabaseTaskOutcomeRepository implements TaskOutcomeRepository {
  constructor(private readonly client: RepoClient) {}
  async listByTask(taskId: string): Promise<TaskOutcome[]> {
    const { data, error } = await this.client
      .from('task_outcomes')
      .select('*')
      .eq('task_id', taskId)
      .order('observed_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapTaskOutcome);
  }
  async getById(id: string): Promise<TaskOutcome | null> {
    const { data, error } = await this.client
      .from('task_outcomes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapTaskOutcome(data) : null;
  }
  async create(input: CreateTaskOutcomeInput): Promise<TaskOutcome> {
    // Cheap floors here; full validation lives in @ai-company/doos-core.
    // We don't import doos-core to keep the dependency graph one-way; the
    // API layer is expected to call validateCreateOutcomeInput before
    // reaching us.
    if (!input.recordedBy || !input.recordedBy.trim()) {
      throw new EmptyRecordedByError();
    }
    const row = {
      task_id: input.taskId,
      metric_name: input.metricName,
      metric_unit: input.metricUnit ?? null,
      baseline_value: input.baselineValue,
      observed_value: input.observedValue,
      direction: input.direction,
      observed_at: input.observedAt,
      window_start: input.windowStart,
      window_end: input.windowEnd,
      source: input.source,
      source_ref: input.sourceRef ?? null,
      recorded_by: input.recordedBy.trim(),
      notes: input.notes ?? null,
    };
    const { data, error } = await this.client
      .from('task_outcomes')
      .insert(row)
      .select('*')
      .single();
    if (error) {
      // DB check constraints provide the second line of defense for the
      // window rules. Re-wrap as InvalidOutcomeInputError so callers
      // distinguish "your input was bad" from "system failure".
      const pgErr = error as { code?: string; message?: string };
      if (pgErr.code === '23514') {
        throw new InvalidOutcomeInputError([pgErr.message ?? 'check_violation']);
      }
      throw error;
    }
    return mapTaskOutcome(data);
  }
  async listByMetric(metricName: string, limit = 50): Promise<TaskOutcome[]> {
    const { data, error } = await this.client
      .from('task_outcomes')
      .select('*')
      .eq('metric_name', metricName)
      .order('observed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapTaskOutcome);
  }
}
