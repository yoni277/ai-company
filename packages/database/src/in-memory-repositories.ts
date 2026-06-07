import { randomUUID } from 'node:crypto';
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
  Project,
  ProjectHealth,
  ProjectMetric,
  ProposalStatus,
  ReportType,
  Risk,
  RiskStatus,
  Task,
  TaskOutcome,
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
  type CreateExecutiveReportInput,
  type DataSourceRecord,
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
  type ProjectMetricRepository,
  ProjectAlreadyExistsError,
  ProjectNotFoundError,
  type ProjectRepository,
  type Repositories,
  type RiskRepository,
  type TaskOutcomeRepository,
  type TaskProposalRepository,
  type TaskRepository,
} from './repositories';

/** Shape an instance supplies when it wants the in-memory store seeded. */
export type InMemorySeedProject = Pick<Project, 'slug' | 'name' | 'description' | 'status'>;

/**
 * Singleton in-memory store. Survives within a single Node process
 * (good for dev and demo, not for prod).
 *
 * NOTE: this class is intentionally instance-agnostic. It holds whatever
 * `seedProjects` the surrounding instance gives it — never a hardcoded
 * portfolio. See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md leak L6.
 */
class Store {
  projects: Project[] = [];
  dataSources: DataSourceRecord[] = [];
  metrics: ProjectMetric[] = [];
  risks: Risk[] = [];
  opportunities: Opportunity[] = [];
  reports: ExecutiveReport[] = [];
  directiveResponses: DirectiveResponseRecord[] = [];
  objectives: Objective[] = [];
  objectiveOutcomes: ObjectiveOutcome[] = [];
  tasks: Task[] = [];
  evidenceTokens: EvidenceToken[] = [];
  taskProposals: TaskProposalRecord[] = [];
  taskOutcomes: TaskOutcome[] = [];

  /**
   * Set by the instance layer (via `InMemoryRepositories` constructor) before
   * the first read. After `seeded` flips to true this field is frozen — later
   * constructors with a different seed are ignored to preserve singleton semantics.
   */
  seedProjects: InMemorySeedProject[] = [];
  seeded = false;

  ensureSeed() {
    if (this.seeded) return;
    this.seeded = true;
    if (this.seedProjects.length === 0) return;
    const now = new Date().toISOString();
    for (const p of this.seedProjects) {
      this.projects.push({
        id: randomUUID(),
        slug: p.slug,
        name: p.name,
        description: p.description,
        status: p.status,
        createdAt: now,
        updatedAt: now,
        // P006 — in-memory seed represents instance-declared projects.
        // Stamp as 'instance-seed' so the source is auditable, distinct from
        // 'pre-p006' (DB-grandfathered) and 'ceo' (explicit registration).
        createdBy: 'instance-seed',
      });
    }
  }
}

const globalKey = Symbol.for('ai-company.in-memory-store');
type GlobalWithStore = typeof globalThis & { [globalKey]?: Store };

/** Returns the singleton store WITHOUT triggering `ensureSeed`. */
function rawStore(): Store {
  const g = globalThis as GlobalWithStore;
  if (!g[globalKey]) g[globalKey] = new Store();
  return g[globalKey];
}

/**
 * Test-only — wipe the singleton in-memory store. Used by package tests
 * that need a clean slate between cases. NOT exported via the package
 * index; callers reach in via the module directly.
 */
export function __resetInMemoryStore(): void {
  const g = globalThis as GlobalWithStore;
  g[globalKey] = new Store();
}

/** Returns the singleton store WITH `ensureSeed` applied. Used by all reads/writes. */
function store(): Store {
  const s = rawStore();
  s.ensureSeed();
  return s;
}

class InMemoryProjectRepository implements ProjectRepository {
  async list(): Promise<Project[]> {
    return [...store().projects].sort((a, b) => a.name.localeCompare(b.name));
  }
  async getBySlug(slug: string): Promise<Project | null> {
    return store().projects.find((p) => p.slug === slug) ?? null;
  }
  async create(input: CreateProjectInput): Promise<Project> {
    if (!input.createdBy || !input.createdBy.trim()) {
      throw new InvalidProjectInputError('createdBy must be a non-empty string');
    }
    const s = store();
    if (s.projects.find((p) => p.slug === input.slug)) {
      throw new ProjectAlreadyExistsError(input.slug);
    }
    const now = new Date().toISOString();
    const created: Project = {
      id: randomUUID(),
      slug: input.slug,
      name: input.name,
      description: input.description,
      status: input.status,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy.trim(),
    };
    s.projects.push(created);
    return created;
  }
  async updateBySlug(
    slug: string,
    patch: UpdateProjectBySlugInput,
  ): Promise<Project> {
    const s = store();
    const existing = s.projects.find((p) => p.slug === slug);
    if (!existing) throw new ProjectNotFoundError(slug);
    if (patch.name !== undefined) existing.name = patch.name;
    if (patch.description !== undefined) existing.description = patch.description;
    if (patch.status !== undefined) existing.status = patch.status;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }
  async setStatus(id: string, status: ProjectHealth): Promise<void> {
    const p = store().projects.find((x) => x.id === id);
    if (p) {
      p.status = status;
      p.updatedAt = new Date().toISOString();
    }
  }
}

class InMemoryDataSourceRepository implements DataSourceRepository {
  async listByProject(projectId: string): Promise<DataSourceRecord[]> {
    return store().dataSources.filter((d) => d.projectId === projectId);
  }
  async upsert(input: Parameters<DataSourceRepository['upsert']>[0]): Promise<DataSourceRecord> {
    const s = store();
    const existing = s.dataSources.find(
      (d) => d.projectId === input.projectId && d.sourceType === input.sourceType,
    );
    if (existing) {
      existing.status = input.status;
      existing.lastSync = input.lastSync;
      existing.lastError = input.lastError;
      return existing;
    }
    const created: DataSourceRecord = { id: randomUUID(), ...input };
    s.dataSources.push(created);
    return created;
  }
}

class InMemoryProjectMetricRepository implements ProjectMetricRepository {
  async listLatestByProject(projectId: string, limitPerName = 1): Promise<ProjectMetric[]> {
    const all = store()
      .metrics.filter((m) => m.projectId === projectId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const grouped = new Map<string, ProjectMetric[]>();
    for (const m of all) {
      const list = grouped.get(m.name) ?? [];
      if (list.length < limitPerName) {
        list.push(m);
        grouped.set(m.name, list);
      }
    }
    return Array.from(grouped.values()).flat();
  }
  async recordMany(metrics: Array<Omit<ProjectMetric, 'id'>>): Promise<ProjectMetric[]> {
    for (const m of metrics) {
      if (!m.recordedBy || !m.recordedBy.trim()) {
        throw new Error('metrics.recordMany: every metric requires non-empty recordedBy');
      }
    }
    const s = store();
    const created = metrics.map((m) => ({
      id: randomUUID(),
      ...m,
      recordedBy: m.recordedBy.trim(),
    }));
    s.metrics.push(...created);
    return created;
  }
}

class InMemoryRiskRepository implements RiskRepository {
  async listOpen(): Promise<Risk[]> {
    return store().risks.filter((r) => r.status === 'open');
  }
  async listByProject(projectId: string, status?: RiskStatus): Promise<Risk[]> {
    return store().risks.filter(
      (r) => r.projectId === projectId && (status ? r.status === status : true),
    );
  }
  async createMany(risks: Array<Omit<Risk, 'id' | 'createdAt'>>): Promise<Risk[]> {
    for (const r of risks) {
      if (!r.recordedBy || !r.recordedBy.trim()) {
        throw new Error('risks.createMany: every risk requires non-empty recordedBy');
      }
      if (!r.fingerprint || !r.fingerprint.trim()) {
        throw new Error('risks.createMany: every risk requires fingerprint');
      }
    }
    const s = store();
    const now = new Date().toISOString();
    const out: Risk[] = [];
    for (const r of risks) {
      const existing = s.risks.find(
        (x) => x.projectId === r.projectId && x.fingerprint === r.fingerprint,
      );
      if (existing) {
        existing.generation += 1;
        out.push(existing);
        continue;
      }
      const created: Risk = {
        id: randomUUID(),
        createdAt: now,
        ...r,
        recordedBy: r.recordedBy.trim(),
      };
      s.risks.push(created);
      out.push(created);
    }
    return out;
  }
  async setStatus(id: string, status: RiskStatus): Promise<void> {
    const r = store().risks.find((x) => x.id === id);
    if (r) r.status = status;
  }
}

class InMemoryOpportunityRepository implements OpportunityRepository {
  async listAll(): Promise<Opportunity[]> {
    return [...store().opportunities];
  }
  async listByProject(projectId: string): Promise<Opportunity[]> {
    return store().opportunities.filter((o) => o.projectId === projectId);
  }
  async createMany(
    opportunities: Array<Omit<Opportunity, 'id' | 'createdAt'>>,
  ): Promise<Opportunity[]> {
    for (const o of opportunities) {
      if (!o.recordedBy || !o.recordedBy.trim()) {
        throw new Error('opportunities.createMany: every opportunity requires non-empty recordedBy');
      }
      if (!o.fingerprint || !o.fingerprint.trim()) {
        throw new Error('opportunities.createMany: every opportunity requires fingerprint');
      }
    }
    const s = store();
    const now = new Date().toISOString();
    const out: Opportunity[] = [];
    for (const o of opportunities) {
      const existing = s.opportunities.find(
        (x) => x.projectId === o.projectId && x.fingerprint === o.fingerprint,
      );
      if (existing) {
        existing.generation += 1;
        out.push(existing);
        continue;
      }
      const created: Opportunity = {
        id: randomUUID(),
        createdAt: now,
        ...o,
        recordedBy: o.recordedBy.trim(),
      };
      s.opportunities.push(created);
      out.push(created);
    }
    return out;
  }
}

class InMemoryExecutiveReportRepository implements ExecutiveReportRepository {
  async list(
    filter: Parameters<ExecutiveReportRepository['list']>[0] = {},
  ): Promise<ExecutiveReport[]> {
    return store()
      .reports.filter(
        (r) =>
          (filter.executiveId ? r.executiveId === filter.executiveId : true) &&
          (filter.reportType ? r.reportType === filter.reportType : true),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filter.limit ?? 50);
  }
  async getById(id: string): Promise<ExecutiveReport | null> {
    return store().reports.find((r) => r.id === id) ?? null;
  }
  async latest(executiveId: string, reportType: ReportType): Promise<ExecutiveReport | null> {
    const list = await this.list({ executiveId, reportType, limit: 1 });
    return list[0] ?? null;
  }
  async create(input: CreateExecutiveReportInput): Promise<ExecutiveReport> {
    const created: ExecutiveReport = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      sourceDirectiveId: input.sourceDirectiveId ?? null,
      executiveId: input.executiveId,
      reportType: input.reportType,
      summary: input.summary,
      body: input.body,
    };
    store().reports.push(created);
    return created;
  }
  async listByDirective(directiveId: string): Promise<ExecutiveReport[]> {
    return store()
      .reports.filter((r) => r.sourceDirectiveId === directiveId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

class InMemoryDirectiveResponseRepository implements DirectiveResponseRepository {
  async listByDirective(directiveId: string): Promise<DirectiveResponseRecord[]> {
    return store()
      .directiveResponses.filter((r) => r.directiveId === directiveId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async listByDirectiveAndStatus(
    directiveId: string,
    status: DirectiveResponseStatus,
  ): Promise<DirectiveResponseRecord[]> {
    return store()
      .directiveResponses.filter(
        (r) => r.directiveId === directiveId && r.status === status,
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async enqueue(
    inputs: EnqueueDirectiveResponseInput[],
  ): Promise<DirectiveResponseRecord[]> {
    const s = store();
    const now = new Date().toISOString();
    const result: DirectiveResponseRecord[] = [];
    for (const input of inputs) {
      const existing = s.directiveResponses.find(
        (r) => r.directiveId === input.directiveId && r.executiveId === input.executiveId,
      );
      if (existing) {
        existing.status = 'pending';
        existing.executiveReportId = null;
        existing.errorMessage = null;
        existing.updatedAt = now;
        result.push(existing);
      } else {
        const created: DirectiveResponseRecord = {
          id: randomUUID(),
          directiveId: input.directiveId,
          executiveId: input.executiveId,
          status: 'pending',
          executiveReportId: null,
          errorMessage: null,
          createdAt: now,
          updatedAt: now,
        };
        s.directiveResponses.push(created);
        result.push(created);
      }
    }
    return result;
  }
  async update(
    id: string,
    input: UpdateDirectiveResponseInput,
  ): Promise<DirectiveResponseRecord> {
    const s = store();
    const row = s.directiveResponses.find((r) => r.id === id);
    if (!row) throw new Error(`directive_response ${id} not found`);
    if (input.status !== undefined) row.status = input.status;
    if (input.executiveReportId !== undefined)
      row.executiveReportId = input.executiveReportId;
    if (input.errorMessage !== undefined) row.errorMessage = input.errorMessage;
    row.updatedAt = new Date().toISOString();
    return row;
  }
}

export interface InMemoryRepositoriesOptions {
  /**
   * Project records the instance layer wants pre-seeded into the in-memory store.
   * Only the FIRST constructor to supply a non-empty list wins (process-singleton
   * semantics); later instantiations are no-ops. Leave undefined or empty to get
   * an empty store — the correct generic-platform default.
   */
  seedProjects?: InMemorySeedProject[];
}

export class InMemoryRepositories implements Repositories {
  readonly projects = new InMemoryProjectRepository();
  readonly dataSources = new InMemoryDataSourceRepository();
  readonly metrics = new InMemoryProjectMetricRepository();
  readonly risks = new InMemoryRiskRepository();
  readonly opportunities = new InMemoryOpportunityRepository();
  readonly reports = new InMemoryExecutiveReportRepository();
  readonly directiveResponses = new InMemoryDirectiveResponseRepository();
  readonly objectives = new InMemoryObjectiveRepository();
  readonly objectiveOutcomes = new InMemoryObjectiveOutcomeRepository();
  readonly tasks = new InMemoryTaskRepository();
  readonly evidenceTokens = new InMemoryEvidenceTokenRepository();
  readonly taskProposals = new InMemoryTaskProposalRepository();
  readonly taskOutcomes = new InMemoryTaskOutcomeRepository();

  constructor(options?: InMemoryRepositoriesOptions) {
    if (options?.seedProjects && options.seedProjects.length > 0) {
      const raw = rawStore();
      // Once the store has been seeded, the seed is frozen — late constructors
      // with a different seed are ignored. This preserves singleton semantics
      // across multiple `new InMemoryRepositories()` calls within one process.
      if (!raw.seeded) raw.seedProjects = options.seedProjects;
    }
  }
}

// ---------- DOOS Phase 1A in-memory implementations ----------

const DEFAULT_EVIDENCE_REQUIRED: EvidenceRequirementSchema = {
  minTier: 'E2',
  requiredKinds: [],
  minCount: 1,
};

class InMemoryObjectiveRepository implements ObjectiveRepository {
  async list(filter?: { status?: ObjectiveStatus }): Promise<Objective[]> {
    const all = store().objectives;
    const filtered = filter?.status ? all.filter((o) => o.status === filter.status) : all;
    return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getById(id: string): Promise<Objective | null> {
    return store().objectives.find((o) => o.id === id) ?? null;
  }
  async create(input: CreateObjectiveInput): Promise<Objective> {
    const now = new Date().toISOString();
    const o: Objective = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      title: input.title,
      description: input.description ?? null,
      ownerId: input.ownerId ?? null,
      status: input.status ?? 'draft',
      targetOutcomeSummary: input.targetOutcomeSummary ?? null,
    };
    store().objectives.push(o);
    return o;
  }
  async update(id: string, input: UpdateObjectiveInput): Promise<Objective> {
    const o = store().objectives.find((x) => x.id === id);
    if (!o) throw new Error(`objective ${id} not found`);
    if (input.title !== undefined) o.title = input.title;
    if (input.description !== undefined) o.description = input.description;
    if (input.ownerId !== undefined) o.ownerId = input.ownerId;
    if (input.status !== undefined) o.status = input.status;
    if (input.targetOutcomeSummary !== undefined) o.targetOutcomeSummary = input.targetOutcomeSummary;
    o.updatedAt = new Date().toISOString();
    return o;
  }
  async countByStatus(status: ObjectiveStatus): Promise<number> {
    return store().objectives.filter((o) => o.status === status).length;
  }
}

class InMemoryObjectiveOutcomeRepository implements ObjectiveOutcomeRepository {
  async listByObjective(objectiveId: string): Promise<ObjectiveOutcome[]> {
    return store()
      .objectiveOutcomes.filter((o) => o.objectiveId === objectiveId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async getById(id: string): Promise<ObjectiveOutcome | null> {
    return store().objectiveOutcomes.find((o) => o.id === id) ?? null;
  }
  async create(input: CreateOutcomeInput): Promise<ObjectiveOutcome> {
    const now = new Date().toISOString();
    const o: ObjectiveOutcome = {
      id: randomUUID(),
      objectiveId: input.objectiveId,
      createdAt: now,
      updatedAt: now,
      name: input.name,
      metricUnit: input.metricUnit ?? null,
      baselineValue: input.baselineValue ?? null,
      targetValue: input.targetValue ?? null,
      currentValue: input.currentValue ?? null,
      measurementSource: input.measurementSource ?? 'manual',
      status: 'pending',
      lastMeasuredAt: null,
    };
    store().objectiveOutcomes.push(o);
    return o;
  }
  async updateMeasurement(id: string, input: UpdateOutcomeMeasurementInput): Promise<ObjectiveOutcome> {
    const o = store().objectiveOutcomes.find((x) => x.id === id);
    if (!o) throw new Error(`outcome ${id} not found`);
    o.currentValue = input.currentValue;
    o.lastMeasuredAt = input.measuredAt ?? new Date().toISOString();
    o.updatedAt = new Date().toISOString();
    if (o.targetValue !== null && o.baselineValue !== null && o.status !== 'achieved') {
      const targetReached =
        o.targetValue > o.baselineValue
          ? o.currentValue >= o.targetValue
          : o.currentValue <= o.targetValue;
      if (targetReached) o.status = 'achieved';
    }
    return o;
  }
  async setStatus(id: string, status: ObjectiveOutcome['status']): Promise<ObjectiveOutcome> {
    const o = store().objectiveOutcomes.find((x) => x.id === id);
    if (!o) throw new Error(`outcome ${id} not found`);
    o.status = status;
    o.updatedAt = new Date().toISOString();
    return o;
  }
}

class InMemoryTaskRepository implements TaskRepository {
  async list(filter?: { objectiveId?: string; directiveId?: string; ownerId?: string; status?: TaskStatus }): Promise<Task[]> {
    let r = store().tasks;
    if (filter?.objectiveId) r = r.filter((t) => t.objectiveId === filter.objectiveId);
    if (filter?.directiveId) r = r.filter((t) => t.directiveId === filter.directiveId);
    if (filter?.ownerId) r = r.filter((t) => t.ownerId === filter.ownerId);
    if (filter?.status) r = r.filter((t) => t.status === filter.status);
    return [...r].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getById(id: string): Promise<Task | null> {
    return store().tasks.find((t) => t.id === id) ?? null;
  }
  async create(input: CreateTaskInput): Promise<Task> {
    const now = new Date().toISOString();
    const t: Task = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      objectiveId: input.objectiveId,
      directiveId: input.directiveId ?? null,
      title: input.title,
      description: input.description ?? null,
      capabilityRequired: input.capabilityRequired,
      ownerId: input.ownerId ?? null,
      status: 'pending',
      evidenceRequired: input.evidenceRequired ?? DEFAULT_EVIDENCE_REQUIRED,
      dueAt: input.dueAt ?? null,
      completedAt: null,
      completedBy: null,
      proposalId: input.proposalId ?? null,
    };
    store().tasks.push(t);
    return t;
  }
  async updateMeta(id: string, input: UpdateTaskInput): Promise<Task> {
    const t = store().tasks.find((x) => x.id === id);
    if (!t) throw new Error(`task ${id} not found`);
    if (input.title !== undefined) t.title = input.title;
    if (input.description !== undefined) t.description = input.description;
    if (input.ownerId !== undefined) t.ownerId = input.ownerId;
    if (input.evidenceRequired !== undefined) t.evidenceRequired = input.evidenceRequired;
    if (input.dueAt !== undefined) t.dueAt = input.dueAt;
    t.updatedAt = new Date().toISOString();
    return t;
  }
  async setStatus(id: string, status: TaskStatus, transition?: { completedBy?: string }): Promise<Task> {
    const t = store().tasks.find((x) => x.id === id);
    if (!t) throw new Error(`task ${id} not found`);
    // Mirror the DB floor trigger: completed requires at least one evidence_token.
    if (status === 'completed' && t.status !== 'completed') {
      const hasEvidence = store().evidenceTokens.some((e) => e.taskId === id);
      if (!hasEvidence) {
        throw new Error(`task ${id} cannot be completed without at least one evidence_token`);
      }
      t.completedAt = new Date().toISOString();
      if (transition?.completedBy) t.completedBy = transition.completedBy;
    }
    t.status = status;
    t.updatedAt = new Date().toISOString();
    return t;
  }
}

/**
 * P007 — kind→tier table mirrored from shared-types and doos-core. Inline
 * here to avoid runtime value imports across packages.
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

class InMemoryEvidenceTokenRepository implements EvidenceTokenRepository {
  async listByTask(taskId: string): Promise<EvidenceToken[]> {
    return store()
      .evidenceTokens.filter((e) => e.taskId === taskId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async create(taskId: string, input: CreateEvidenceTokenInput): Promise<EvidenceToken> {
    // P007 — provenance + payload floor. Createdby must be non-empty;
    // evidenceKind required; tier derived from kind (never accepted from
    // caller); human_attestation requires both override fields.
    if (!input.createdBy || !input.createdBy.trim()) {
      throw new Error('createdBy must be a non-empty string');
    }
    if (!input.evidenceKind) {
      throw new Error('evidenceKind is required');
    }
    const tier = KIND_TIER[input.evidenceKind];
    if (!tier) throw new Error(`unknown evidenceKind: ${String(input.evidenceKind)}`);
    const isAttestation = input.evidenceKind === 'human_attestation';
    if (isAttestation) {
      if (!input.overrideReason || !input.overrideReason.trim())
        throw new Error('human_attestation requires overrideReason');
      if (!input.approvedBy || !input.approvedBy.trim())
        throw new Error('human_attestation requires approvedBy');
    }

    const now = new Date().toISOString();
    const base = {
      id: randomUUID(),
      taskId,
      createdAt: now,
      createdBy: input.createdBy.trim(),
      kind: input.kind ?? input.evidenceKind,
      payload: input.payload ?? {},
      signedBy: input.signedBy ?? null,
      verifiedAt: null,
      validatorVersion: null,
      sourceKind: input.sourceKind,
      sourceRef: input.sourceRef ?? null,
      evidenceKind: input.evidenceKind,
      evidenceHash: input.evidenceHash ?? null,
    };
    let token: EvidenceToken;
    if (isAttestation) {
      token = {
        ...base,
        tier: 'E1',
        evidenceKind: 'human_attestation',
        overrideReason: input.overrideReason!,
        approvedBy: input.approvedBy!,
      };
    } else {
      token = {
        ...base,
        tier,
        overrideReason: null,
        approvedBy: null,
      } as EvidenceToken;
    }
    store().evidenceTokens.push(token);
    return token;
  }
  async markVerified(id: string, validatorVersion: string): Promise<EvidenceToken> {
    const e = store().evidenceTokens.find((x) => x.id === id);
    if (!e) throw new Error(`evidence_token ${id} not found`);
    e.verifiedAt = new Date().toISOString();
    e.validatorVersion = validatorVersion;
    return e;
  }
}

/**
 * P005A — TaskProposal repository (in-memory).
 *
 * Mirrors the Supabase shape: upsert by (directive_id, fingerprint) bumps
 * the row's `generation` instead of creating a duplicate. Decision
 * transitions move status from 'proposed' to 'approved' or 'rejected' and
 * stamp decided_at + decided_by. The promotion-to-Task step lives in the
 * dashboard route handler — this repository never creates tasks.
 */
class InMemoryTaskProposalRepository implements TaskProposalRepository {
  async listByDirective(directiveId: string): Promise<TaskProposalRecord[]> {
    return store()
      .taskProposals.filter((p) => p.directiveId === directiveId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async listByStatus(status: ProposalStatus): Promise<TaskProposalRecord[]> {
    return store()
      .taskProposals.filter((p) => p.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getById(id: string): Promise<TaskProposalRecord | null> {
    return store().taskProposals.find((p) => p.id === id) ?? null;
  }
  async upsert(input: UpsertTaskProposalInput): Promise<TaskProposalRecord> {
    const existing = store().taskProposals.find(
      (p) =>
        p.directiveId === input.directiveId && p.fingerprint === input.fingerprint,
    );
    if (existing) {
      existing.generation += 1;
      existing.payload = input.payload;
      existing.proposalType = input.proposalType;
      existing.sourceExecutiveId = input.sourceExecutiveId;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }
    const now = new Date().toISOString();
    const rec: TaskProposalRecord = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      directiveId: input.directiveId,
      sourceExecutiveId: input.sourceExecutiveId,
      proposalType: input.proposalType,
      fingerprint: input.fingerprint,
      payload: input.payload,
      status: 'proposed',
      generation: 1,
      decidedAt: null,
      decidedBy: null,
    };
    store().taskProposals.push(rec);
    return rec;
  }
  async decide(
    id: string,
    input: DecideTaskProposalInput,
  ): Promise<TaskProposalRecord> {
    const p = store().taskProposals.find((x) => x.id === id);
    if (!p) throw new Error(`task_proposal ${id} not found`);
    if (p.status !== 'proposed') {
      throw new Error(
        `task_proposal ${id} cannot be decided: current status ${p.status}`,
      );
    }
    p.status = input.status;
    p.decidedAt = new Date().toISOString();
    p.decidedBy = input.decidedBy;
    p.updatedAt = p.decidedAt;
    return p;
  }
}

/**
 * P008 — Outcome Attribution repository (in-memory).
 *
 * Append-only. Mirror of the Supabase implementation. Validates recordedBy
 * non-empty + window invariants (start <= observedAt <= end) so the
 * in-memory backend matches the DB check constraints byte-for-byte.
 */
class InMemoryTaskOutcomeRepository implements TaskOutcomeRepository {
  async listByTask(taskId: string): Promise<TaskOutcome[]> {
    return store()
      .taskOutcomes.filter((o) => o.taskId === taskId)
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  }
  async getById(id: string): Promise<TaskOutcome | null> {
    return store().taskOutcomes.find((o) => o.id === id) ?? null;
  }
  async create(input: CreateTaskOutcomeInput): Promise<TaskOutcome> {
    if (!input.recordedBy || !input.recordedBy.trim()) {
      throw new EmptyRecordedByError();
    }
    if (input.windowStart > input.windowEnd) {
      throw new InvalidOutcomeInputError(['windowStart must be <= windowEnd']);
    }
    if (input.observedAt < input.windowStart || input.observedAt > input.windowEnd) {
      throw new InvalidOutcomeInputError([
        `observedAt (${input.observedAt}) outside [${input.windowStart}, ${input.windowEnd}]`,
      ]);
    }
    const now = new Date().toISOString();
    const rec: TaskOutcome = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      taskId: input.taskId,
      metricName: input.metricName,
      metricUnit: input.metricUnit ?? null,
      baselineValue: input.baselineValue,
      observedValue: input.observedValue,
      delta: input.observedValue - input.baselineValue,
      direction: input.direction,
      observedAt: input.observedAt,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      source: input.source,
      sourceRef: input.sourceRef ?? null,
      recordedBy: input.recordedBy.trim(),
      notes: input.notes ?? null,
    };
    store().taskOutcomes.push(rec);
    return rec;
  }
  async listByMetric(metricName: string, limit = 50): Promise<TaskOutcome[]> {
    return store()
      .taskOutcomes.filter((o) => o.metricName === metricName)
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
      .slice(0, limit);
  }
}
