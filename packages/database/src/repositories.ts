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

export interface DataSourceRecord {
  id: string;
  projectId: string;
  sourceType: string;
  status: 'ok' | 'degraded' | 'error' | 'unknown';
  lastSync: string | null;
  lastError: string | null;
}

/**
 * P006 — Project repository.
 *
 * Doctrine (D023 + D038): the platform never silently creates project rows.
 *   - `create`  : the SINGLE insert path. Requires non-empty `createdBy`.
 *                 Throws `ProjectAlreadyExistsError` on slug conflict so the
 *                 caller decides whether that's a real error or expected.
 *   - `updateBySlug` : refreshes name/description/status on an existing row.
 *                     Throws `ProjectNotFoundError` if the slug is missing
 *                     (used by SyncOrchestrator to detect unregistered slugs
 *                     and skip the connector run rather than create state).
 *
 * `upsertBySlug` was removed in P006 — it was the silent-mutation primitive.
 */
export class ProjectAlreadyExistsError extends Error {
  constructor(public readonly slug: string) {
    super(`project with slug "${slug}" already exists`);
    this.name = 'ProjectAlreadyExistsError';
  }
}
export class ProjectNotFoundError extends Error {
  constructor(public readonly slug: string) {
    super(`project with slug "${slug}" is not registered`);
    this.name = 'ProjectNotFoundError';
  }
}
export class InvalidProjectInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProjectInputError';
  }
}

export interface ProjectRepository {
  list(): Promise<Project[]>;
  getBySlug(slug: string): Promise<Project | null>;
  /** P006 — explicit registration. Throws on duplicate slug. */
  create(input: CreateProjectInput): Promise<Project>;
  /** P006 — refresh existing row. Throws on missing slug. */
  updateBySlug(slug: string, patch: UpdateProjectBySlugInput): Promise<Project>;
  setStatus(id: string, status: ProjectHealth): Promise<void>;
}

export interface DataSourceRepository {
  listByProject(projectId: string): Promise<DataSourceRecord[]>;
  upsert(input: {
    projectId: string;
    sourceType: string;
    status: DataSourceRecord['status'];
    lastSync: string | null;
    lastError: string | null;
  }): Promise<DataSourceRecord>;
}

export interface ProjectMetricRepository {
  listLatestByProject(projectId: string, limitPerName?: number): Promise<ProjectMetric[]>;
  recordMany(metrics: Array<Omit<ProjectMetric, 'id'>>): Promise<ProjectMetric[]>;
}

export interface RiskRepository {
  listOpen(): Promise<Risk[]>;
  listByProject(projectId: string, status?: RiskStatus): Promise<Risk[]>;
  createMany(risks: Array<Omit<Risk, 'id' | 'createdAt'>>): Promise<Risk[]>;
  setStatus(id: string, status: RiskStatus): Promise<void>;
}

export interface OpportunityRepository {
  listAll(): Promise<Opportunity[]>;
  listByProject(projectId: string): Promise<Opportunity[]>;
  createMany(opportunities: Array<Omit<Opportunity, 'id' | 'createdAt'>>): Promise<Opportunity[]>;
}

/**
 * Insert shape for executive_reports. sourceDirectiveId is optional at the
 * caller — defaults to null — so daily / weekly briefings don't have to
 * thread it through.
 */
export type CreateExecutiveReportInput =
  Omit<ExecutiveReport, 'id' | 'createdAt' | 'sourceDirectiveId'> & {
    sourceDirectiveId?: string | null;
  };

export interface ExecutiveReportRepository {
  list(filter?: { executiveId?: string; reportType?: ReportType; limit?: number }): Promise<
    ExecutiveReport[]
  >;
  getById(id: string): Promise<ExecutiveReport | null>;
  latest(executiveId: string, reportType: ReportType): Promise<ExecutiveReport | null>;
  create(input: CreateExecutiveReportInput): Promise<ExecutiveReport>;
  /**
   * All reports produced as ad-hoc responses to a given CEO directive,
   * newest first. Used by the directive detail page to show fan-out progress.
   */
  listByDirective(directiveId: string): Promise<ExecutiveReport[]>;
}

/**
 * Generic queue for directive fan-out responses. Insert side: directive
 * POST/PATCH enqueues one pending row per responding executive. Drain side:
 * the run-pending endpoint reads pending rows, dispatches via the
 * DirectiveResponderRegistry, and marks done/error.
 *
 * IMPORTANT: this repository — and any caller — must treat `executiveId` as
 * opaque data. Do not branch on specific executive id values here. Dispatch
 * happens through the registry, not switch/case.
 */
export interface DirectiveResponseRepository {
  listByDirective(directiveId: string): Promise<DirectiveResponseRecord[]>;
  /**
   * For each input, upsert a (directiveId, executiveId) row. Existing rows
   * keep their id but get their status reset to 'pending' and previous
   * report/error cleared, so a PATCH re-run produces a single source of truth.
   */
  enqueue(
    inputs: EnqueueDirectiveResponseInput[],
  ): Promise<DirectiveResponseRecord[]>;
  /**
   * Read all rows in a given status for a directive, oldest first. Used by
   * the worker to claim work.
   */
  listByDirectiveAndStatus(
    directiveId: string,
    status: DirectiveResponseStatus,
  ): Promise<DirectiveResponseRecord[]>;
  /**
   * Update a row by id. Worker calls this once to set 'running', then again
   * to set 'done'/'error' with the resulting report id or error message.
   */
  update(
    id: string,
    input: UpdateDirectiveResponseInput,
  ): Promise<DirectiveResponseRecord>;
}

// ---------- DOOS Phase 1A repositories ----------

export interface ObjectiveRepository {
  list(filter?: { status?: ObjectiveStatus }): Promise<Objective[]>;
  getById(id: string): Promise<Objective | null>;
  create(input: CreateObjectiveInput): Promise<Objective>;
  update(id: string, input: UpdateObjectiveInput): Promise<Objective>;
  countByStatus(status: ObjectiveStatus): Promise<number>;
}

export interface ObjectiveOutcomeRepository {
  listByObjective(objectiveId: string): Promise<ObjectiveOutcome[]>;
  getById(id: string): Promise<ObjectiveOutcome | null>;
  create(input: CreateOutcomeInput): Promise<ObjectiveOutcome>;
  updateMeasurement(
    id: string,
    input: UpdateOutcomeMeasurementInput,
  ): Promise<ObjectiveOutcome>;
  setStatus(
    id: string,
    status: ObjectiveOutcome['status'],
  ): Promise<ObjectiveOutcome>;
}

export interface TaskRepository {
  list(filter?: {
    objectiveId?: string;
    directiveId?: string;
    ownerId?: string;
    status?: TaskStatus;
  }): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  create(input: CreateTaskInput): Promise<Task>;
  updateMeta(id: string, input: UpdateTaskInput): Promise<Task>;
  /**
   * Transitions task.status. When target status is 'completed' the floor
   * trigger requires at least one evidence_token to exist; the application
   * validator must already have approved the transition before this call.
   */
  setStatus(
    id: string,
    status: TaskStatus,
    transition?: { completedBy?: string },
  ): Promise<Task>;
}

export interface EvidenceTokenRepository {
  listByTask(taskId: string): Promise<EvidenceToken[]>;
  create(taskId: string, input: CreateEvidenceTokenInput): Promise<EvidenceToken>;
  markVerified(id: string, validatorVersion: string): Promise<EvidenceToken>;
}

/**
 * P005A — TaskProposal repository.
 *
 * The proposal layer is the governance boundary: every executive output
 * lands here first as `status='proposed'` rows. The CEO promotes them to
 * tasks (status → 'approved') or rejects them. `upsert` enforces dedup by
 * (directive_id, fingerprint) — a rerun of the same directive bumps
 * `generation` instead of creating a duplicate row.
 *
 * This repository NEVER creates tasks. Promotion-to-Task is a workflow
 * step owned by the dashboard route handler so the audit trail (who
 * approved when) is a single decision event, not split across layers.
 */
export interface TaskProposalRepository {
  listByDirective(directiveId: string): Promise<TaskProposalRecord[]>;
  listByStatus(status: ProposalStatus): Promise<TaskProposalRecord[]>;
  getById(id: string): Promise<TaskProposalRecord | null>;
  upsert(input: UpsertTaskProposalInput): Promise<TaskProposalRecord>;
  decide(id: string, input: DecideTaskProposalInput): Promise<TaskProposalRecord>;
}

/**
 * P008 — Outcome Attribution repository.
 *
 * Append-only by doctrine (Chief Architect 2026-06-05). Note the contract
 * has NO `update` and NO `delete` — outcomes are immutable once recorded.
 * Corrections happen via new records, not destructive edits.
 */
export class EmptyRecordedByError extends Error {
  constructor() {
    super('recordedBy must be a non-empty string');
    this.name = 'EmptyRecordedByError';
  }
}
export class InvalidOutcomeInputError extends Error {
  constructor(reasons: string[]) {
    super(`outcome input invalid: ${reasons.join('; ')}`);
    this.name = 'InvalidOutcomeInputError';
  }
}

export interface TaskOutcomeRepository {
  listByTask(taskId: string): Promise<TaskOutcome[]>;
  getById(id: string): Promise<TaskOutcome | null>;
  /** Single insert path. recordedBy required. Inputs validated upstream by doos-core. */
  create(input: CreateTaskOutcomeInput): Promise<TaskOutcome>;
  /** Cross-task metric history — read-only convenience for UI trend views. */
  listByMetric(metricName: string, limit?: number): Promise<TaskOutcome[]>;
}

export interface Repositories {
  projects: ProjectRepository;
  dataSources: DataSourceRepository;
  metrics: ProjectMetricRepository;
  risks: RiskRepository;
  opportunities: OpportunityRepository;
  reports: ExecutiveReportRepository;
  directiveResponses: DirectiveResponseRepository;
  objectives: ObjectiveRepository;
  objectiveOutcomes: ObjectiveOutcomeRepository;
  tasks: TaskRepository;
  evidenceTokens: EvidenceTokenRepository;
  taskProposals: TaskProposalRepository;
  taskOutcomes: TaskOutcomeRepository;
}
