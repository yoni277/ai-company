import 'server-only';

/**
 * EPIC-004A — Work Model Convergence (D079). Spec §4 Phase 2 / §5.
 *
 * The Supabase ADAPTER over the assigned_work spine. All pure control logic and
 * the three invariants live in work-control-core.ts (unit-tested); this module
 * binds them to the real service-role client + ceo_decisions writer, and hosts
 * the headless read selectors (attention queue, no-orphan audit).
 *
 * Cloneable: zero business specifics, project_slug-scoped, generic entities.
 */

import { getSupabaseAdmin } from '../doos/supabase-admin';
import { createDecision } from '../ceo-operating-system';
import {
  approveWork,
  rejectWork,
  setWorkExecutionStatus,
  assembleAttentionQueue,
  assembleWorkList,
  type WorkSpineStore,
  type ApprovableWork,
  type DecisionRequest,
  type ExecutionStatus,
  type ApproveResult,
  type AttentionItem,
  type AttentionSourceRow,
  type WorkListItem,
  type WorkListDerivedFilter,
} from './work-control-core';

// Re-export the gate + error so existing importers (e.g. meetings.ts) are stable.
export { assertApprovable, NeedsCeoCompletionError } from './work-control-core';
export type { ApproveResult, AttentionItem, WorkListItem } from './work-control-core';

/** Now, as an ISO timestamptz — single source for every status stamp. */
function nowISO(): string {
  return new Date().toISOString();
}

/** Columns every classifier/queue read needs off assigned_work. */
const WORK_COLUMNS =
  'id, project_slug, source_type, source_id, owner_executive_id, title, detail, ' +
  'approval_status, execution_status, priority, due_date, review_date, ' +
  'linked_task_id, linked_decision_id, created_by, created_at, status_changed_at';

interface AssignedWorkRow {
  id: string;
  project_slug: string;
  source_type: string;
  source_id: string;
  owner_executive_id: string | null;
  title: string;
  detail: string | null;
  approval_status: string;
  execution_status: string;
  priority: string;
  due_date: string | null;
  review_date: string | null;
  linked_task_id: string | null;
  linked_decision_id: string | null;
  created_by: string;
  created_at: string;
  status_changed_at: string;
}

/**
 * Bind the pure orchestration to the real Supabase + ceo_decisions writer. Each
 * mutating method always passes the injected `at` so status_changed_at is
 * stamped on every transition (AC13).
 */
function supabaseStore(): WorkSpineStore {
  const supa = getSupabaseAdmin();
  return {
    now: nowISO,
    async getApprovable(workId: string): Promise<ApprovableWork | null> {
      const { data, error } = await supa
        .from('assigned_work')
        .select(
          'id, project_slug, title, detail, owner_executive_id, approval_status, due_date, review_date',
        )
        .eq('id', workId)
        .single();
      if (error || !data) return null;
      return {
        id: data.id,
        projectSlug: data.project_slug,
        title: data.title,
        detail: data.detail ?? null,
        ownerExecutiveId: data.owner_executive_id ?? null,
        approvalStatus: data.approval_status,
        dueDate: data.due_date ?? null,
        reviewDate: data.review_date ?? null,
      };
    },
    async createDecision(input: DecisionRequest): Promise<{ id: string }> {
      const decision = await createDecision({
        sourceActionId: null,
        projectId: input.projectId,
        decisionTitle: input.decisionTitle,
        decisionDescription: input.decisionDescription,
        decisionStatus: 'approved',
        owner: input.owner,
        dueDate: input.dueDate,
        priority: 'P2',
        ...(input.notes ? { notes: input.notes } : {}),
      });
      return { id: decision.id };
    },
    async markApproved(workId: string, decisionId: string, at: string): Promise<void> {
      const { error } = await supa
        .from('assigned_work')
        .update({ approval_status: 'approved', linked_decision_id: decisionId, status_changed_at: at })
        .eq('id', workId)
        .eq('approval_status', 'proposed');
      if (error) throw new Error(error.message);
    },
    async markRejected(workId: string, at: string): Promise<void> {
      const { error } = await supa
        .from('assigned_work')
        .update({ approval_status: 'rejected', status_changed_at: at })
        .eq('id', workId)
        .eq('approval_status', 'proposed');
      if (error) throw new Error(error.message);
    },
    async setExecution(
      workId: string,
      to: ExecutionStatus,
      at: string,
      expectFrom?: string,
    ): Promise<void> {
      let q = supa
        .from('assigned_work')
        .update({ execution_status: to, status_changed_at: at })
        .eq('id', workId);
      if (expectFrom) q = q.eq('execution_status', expectFrom);
      const { error } = await q;
      if (error) throw new Error(error.message);
    },
  };
}

/** Approve a single assigned_work row through the ceo_decisions gate (AC1/AC2/AC13). */
export async function approveAssignedWork(
  workId: string,
  opts?: { notes?: string },
): Promise<ApproveResult> {
  return approveWork(supabaseStore(), workId, opts);
}

/** Reject a proposed work row. Stamps status_changed_at. */
export async function rejectAssignedWork(workId: string): Promise<void> {
  await rejectWork(supabaseStore(), workId);
}

/**
 * Transition execution_status (open → in_progress → blocked/done/cancelled).
 * Always stamps status_changed_at. `expectFrom` guards races / idempotent re-clicks.
 */
export async function setExecutionStatus(
  workId: string,
  to: ExecutionStatus,
  opts?: { expectFrom?: string },
): Promise<void> {
  await setWorkExecutionStatus(supabaseStore(), workId, to, opts);
}

export interface PatchWorkInput {
  ownerExecutiveId?: string;
  dueDate?: string | null;
  reviewDate?: string | null;
}

/**
 * Set owner / due_date / review_date on a work row. This is NOT a status
 * transition (approval_status & execution_status are untouched), so it does NOT
 * stamp status_changed_at — but it CAN clear the derived "Needs CEO Completion"
 * state by supplying the missing owner/date. Returns the patched row.
 */
export async function patchWorkFields(
  workId: string,
  input: PatchWorkInput,
): Promise<{ id: string; ownerExecutiveId: string | null; dueDate: string | null; reviewDate: string | null }> {
  const supa = getSupabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (input.ownerExecutiveId !== undefined) patch.owner_executive_id = input.ownerExecutiveId;
  if (input.dueDate !== undefined) patch.due_date = input.dueDate;
  if (input.reviewDate !== undefined) patch.review_date = input.reviewDate;
  if (Object.keys(patch).length === 0) throw new Error('no fields to update');

  const { data, error } = await supa
    .from('assigned_work')
    .update(patch)
    .eq('id', workId)
    .select('id, owner_executive_id, due_date, review_date')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'assigned_work not found');
  return {
    id: data.id,
    ownerExecutiveId: data.owner_executive_id ?? null,
    dueDate: data.due_date ?? null,
    reviewDate: data.review_date ?? null,
  };
}

/* ----------------------------------------------------------------------------
 * Phase 4 — headless read selectors (AC9/AC11/AC12).
 * -------------------------------------------------------------------------- */

/**
 * AC12 — the unified CEO Attention Queue. Fetches the spine (project_slug-scoped)
 * + the L34 awaiting-CEO-input set, then delegates classification/sort to the
 * pure assembler. Empty-state-valid: a fresh business yields [].
 */
export async function loadCeoAttentionQueue(projectSlug?: string): Promise<AttentionItem[]> {
  const supa = getSupabaseAdmin();
  let workQ = supa.from('assigned_work').select(WORK_COLUMNS);
  if (projectSlug) workQ = workQ.eq('project_slug', projectSlug);
  const { data: work, error } = await workQ;
  if (error) throw new Error(error.message);
  // WORK_COLUMNS is a runtime string, so PostgREST can't infer the row shape.
  const rows = (work ?? []) as unknown as AssignedWorkRow[];
  const awaitingWorkIds = await fetchAwaitingWorkIds(supa, projectSlug);
  return assembleAttentionQueue(rows.map(toSourceRow), awaitingWorkIds, nowISO());
}

/** Map a raw assigned_work row to the core's source-row shape. */
function toSourceRow(r: AssignedWorkRow): AttentionSourceRow {
  return {
    id: r.id,
    projectSlug: r.project_slug,
    sourceType: r.source_type,
    sourceId: r.source_id,
    ownerExecutiveId: r.owner_executive_id,
    title: r.title,
    priority: r.priority,
    approvalStatus: r.approval_status,
    executionStatus: r.execution_status,
    dueDate: r.due_date,
    reviewDate: r.review_date,
    createdAt: r.created_at,
    statusChangedAt: r.status_changed_at,
    detail: r.detail,
    linkedTaskId: r.linked_task_id,
    linkedDecisionId: r.linked_decision_id,
  };
}

/** Fetch the set of assigned_work ids whose linked instruction is awaiting a CEO answer (L34). */
async function fetchAwaitingWorkIds(
  supa: ReturnType<typeof getSupabaseAdmin>,
  projectSlug?: string,
): Promise<Set<string>> {
  let q = supa
    .from('direct_instructions')
    .select('linked_assigned_work_id')
    .eq('awaiting_ceo_input', true);
  if (projectSlug) q = q.eq('project_slug', projectSlug);
  const { data } = await q;
  return new Set(
    (data ?? [])
      .map((a: { linked_assigned_work_id: string | null }) => a.linked_assigned_work_id)
      .filter((x: string | null): x is string => Boolean(x)),
  );
}

/** Raw-column filters applied at the DB; derived filters applied post-classify. */
export interface WorkListFilters {
  projectSlug?: string;
  ownerExecutiveId?: string;
  sourceType?: string;
  priority?: string;
  approvalStatus?: string;
  executionStatus?: string;
  /** ISO date (YYYY-MM-DD) — keep rows with due_date <= / >= these. */
  dueBefore?: string;
  dueAfter?: string;
  /** Derived (post-classify). */
  states?: readonly WorkStateName[];
  waitingOnCeo?: boolean;
  blocked?: boolean;
}

type WorkStateName = WorkListItem['state'];

/**
 * AC7 — the master work list: every assigned_work row (all three source types),
 * classified, aged, filtered. Raw-column filters narrow at the DB; derived-state
 * filters (waiting-on-CEO, blocked, specific states) apply after classification.
 * project_slug-scoped; empty business → []. Grouping is the UI's job.
 */
export async function loadWorkMasterList(filters: WorkListFilters = {}): Promise<WorkListItem[]> {
  const supa = getSupabaseAdmin();
  let q = supa.from('assigned_work').select(WORK_COLUMNS);
  if (filters.projectSlug) q = q.eq('project_slug', filters.projectSlug);
  if (filters.ownerExecutiveId) q = q.eq('owner_executive_id', filters.ownerExecutiveId);
  if (filters.sourceType) q = q.eq('source_type', filters.sourceType);
  if (filters.priority) q = q.eq('priority', filters.priority);
  if (filters.approvalStatus) q = q.eq('approval_status', filters.approvalStatus);
  if (filters.executionStatus) q = q.eq('execution_status', filters.executionStatus);
  if (filters.dueBefore) q = q.lte('due_date', filters.dueBefore);
  if (filters.dueAfter) q = q.gte('due_date', filters.dueAfter);

  const { data: work, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (work ?? []) as unknown as AssignedWorkRow[];

  const awaitingWorkIds = await fetchAwaitingWorkIds(supa, filters.projectSlug);

  const derived: WorkListDerivedFilter = {
    ...(filters.states ? { states: filters.states } : {}),
    ...(filters.waitingOnCeo ? { waitingOnCeo: true } : {}),
    ...(filters.blocked ? { blocked: true } : {}),
  };
  return assembleWorkList(rows.map(toSourceRow), awaitingWorkIds, nowISO(), derived);
}

export interface NoOrphanAudit {
  tasksTotal: number;
  tasksWithoutWork: number; // AC6/AC11: must be 0 after backfill
  workTotal: number;
  workWithUnresolvedSource: number; // AC11: every source_id must resolve
  unresolvedSampleIds: string[];
}

/**
 * AC11 — No-Orphan audit. Every task must point at an assigned_work; every
 * assigned_work.source_id must resolve in its declared source table. Returns
 * the counts Cowork asserts post-backfill (both deltas must reach 0).
 */
export async function auditNoOrphans(): Promise<NoOrphanAudit> {
  const supa = getSupabaseAdmin();

  const { count: tasksTotal } = await supa
    .from('tasks')
    .select('id', { count: 'exact', head: true });
  const { count: tasksWithoutWork } = await supa
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .is('assigned_work_id', null);

  const { data: work } = await supa.from('assigned_work').select('id, source_type, source_id');
  const rows = (work ?? []) as Array<{ id: string; source_type: string; source_id: string }>;

  // Resolve source ids in bulk, one query per source table.
  const SOURCE_TABLE: Record<string, string> = {
    directive: 'ceo_directives',
    meeting: 'meetings',
    instruction: 'direct_instructions',
  };
  const byType = new Map<string, Set<string>>();
  for (const [type, table] of Object.entries(SOURCE_TABLE)) {
    const ids = rows.filter((r) => r.source_type === type).map((r) => r.source_id);
    if (ids.length === 0) {
      byType.set(type, new Set());
      continue;
    }
    const { data: found } = await supa.from(table).select('id').in('id', ids);
    byType.set(type, new Set((found ?? []).map((f: { id: string }) => f.id)));
  }

  const unresolved = rows.filter((r) => {
    const known = byType.get(r.source_type);
    return !known || !known.has(r.source_id);
  });

  return {
    tasksTotal: tasksTotal ?? 0,
    tasksWithoutWork: tasksWithoutWork ?? 0,
    workTotal: rows.length,
    workWithUnresolvedSource: unresolved.length,
    unresolvedSampleIds: unresolved.slice(0, 10).map((r) => r.id),
  };
}
