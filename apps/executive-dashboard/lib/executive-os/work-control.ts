import 'server-only';

/**
 * EPIC-004A — Work Model Convergence (D079). Spec §4 Phase 2 / §5.
 *
 * The control layer over the assigned_work spine. Owns the three invariants the
 * data model must never violate, plus the headless selectors EPIC-004's screens
 * will read:
 *
 *   (1) No work reaches `approved` without a ceo_decisions row (the gate).
 *   (2) No work ACTIVATES (→approved) without an owner AND a date present
 *       (due_date or review_date). Dateless proposed work is the derived
 *       "Needs CEO Completion" state — surfaced, never silently approved (AC2).
 *   (3) Every approval_status / execution_status transition stamps
 *       status_changed_at = now() in the SAME write, so AC13 "days in current
 *       state" aging is accurate.
 *
 * Cloneable: zero business specifics, project_slug-scoped, generic entities.
 */

import { getSupabaseAdmin } from '../doos/supabase-admin';
import { createDecision } from '../ceo-operating-system';
import {
  classifyWork,
  isAttentionState,
  type WorkRowForState,
  type WorkState,
} from './work-state';

/** Thrown when an approval is attempted on work that is missing an owner or a date. */
export class NeedsCeoCompletionError extends Error {
  readonly code = 'NEEDS_CEO_COMPLETION';
  constructor(message: string) {
    super(message);
    this.name = 'NeedsCeoCompletionError';
  }
}

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

function toStateRow(r: AssignedWorkRow, awaitingCeoInput: boolean): WorkRowForState {
  return {
    approvalStatus: r.approval_status,
    executionStatus: r.execution_status,
    dueDate: r.due_date,
    reviewDate: r.review_date,
    createdAt: r.created_at,
    statusChangedAt: r.status_changed_at,
    awaitingCeoInput,
  };
}

/**
 * The gate that protects activation (AC1/AC2). Throws NeedsCeoCompletionError
 * when the row cannot honestly be approved. Callers approving in a batch (e.g.
 * meeting approval) catch this per-row and skip, rather than failing the batch.
 */
export function assertApprovable(row: {
  owner_executive_id: string | null;
  due_date: string | null;
  review_date: string | null;
}): void {
  const missingOwner = !row.owner_executive_id;
  const missingDate = !row.due_date && !row.review_date;
  if (missingOwner || missingDate) {
    const missing = [missingOwner ? 'an owner' : null, missingDate ? 'a date or review checkpoint' : null]
      .filter(Boolean)
      .join(' and ');
    throw new NeedsCeoCompletionError(
      `Needs CEO completion: set ${missing} before this work can be approved.`,
    );
  }
}

export interface ApproveResult {
  workId: string;
  decisionId: string;
}

/**
 * Approve a single assigned_work row through the ceo_decisions gate. Generic
 * across source_type (directive / meeting / instruction). Enforces the gate,
 * writes the decision audit row, flips proposed→approved, and stamps
 * status_changed_at. Idempotent: only acts while the row is still `proposed`.
 */
export async function approveAssignedWork(
  workId: string,
  opts?: { notes?: string },
): Promise<ApproveResult> {
  const supa = getSupabaseAdmin();
  const { data: row, error } = await supa
    .from('assigned_work')
    .select('id, project_slug, title, detail, owner_executive_id, approval_status, due_date, review_date')
    .eq('id', workId)
    .single();
  if (error || !row) throw new Error('assigned_work not found');
  if (row.approval_status !== 'proposed') {
    throw new Error(`work is '${row.approval_status}', not awaiting approval`);
  }

  assertApprovable(row);

  const decision = await createDecision({
    sourceActionId: null,
    projectId: row.project_slug,
    decisionTitle: row.title,
    decisionDescription: row.detail ?? null,
    decisionStatus: 'approved',
    owner: row.owner_executive_id ?? null,
    dueDate: row.due_date ?? null,
    priority: 'P2',
    ...(opts?.notes ? { notes: opts.notes } : {}),
  });

  const { error: uErr } = await supa
    .from('assigned_work')
    .update({
      approval_status: 'approved',
      linked_decision_id: decision.id,
      status_changed_at: nowISO(),
    })
    .eq('id', workId)
    .eq('approval_status', 'proposed');
  if (uErr) throw new Error(uErr.message);

  return { workId, decisionId: decision.id };
}

/** Reject a proposed work row. Stamps status_changed_at. */
export async function rejectAssignedWork(workId: string): Promise<void> {
  const supa = getSupabaseAdmin();
  const { error } = await supa
    .from('assigned_work')
    .update({ approval_status: 'rejected', status_changed_at: nowISO() })
    .eq('id', workId)
    .eq('approval_status', 'proposed');
  if (error) throw new Error(error.message);
}

/**
 * Transition execution_status (open → in_progress → blocked/done/cancelled).
 * The ONLY supported way to move execution_status — always stamps
 * status_changed_at so aging stays correct. `expectFrom` makes the write a
 * no-op when the row already moved (idempotent re-clicks / races).
 */
export async function setExecutionStatus(
  workId: string,
  to: 'open' | 'in_progress' | 'blocked' | 'done' | 'cancelled',
  opts?: { expectFrom?: string },
): Promise<void> {
  const supa = getSupabaseAdmin();
  let q = supa
    .from('assigned_work')
    .update({ execution_status: to, status_changed_at: nowISO() })
    .eq('id', workId);
  if (opts?.expectFrom) q = q.eq('execution_status', opts.expectFrom);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

/* ----------------------------------------------------------------------------
 * Phase 4 — headless selectors (AC9/AC11/AC12). Read-only over the spine.
 * -------------------------------------------------------------------------- */

export interface AttentionItem {
  id: string;
  projectSlug: string;
  sourceType: string;
  sourceId: string;
  ownerExecutiveId: string | null;
  title: string;
  priority: string;
  state: WorkState;
  ageDays: number;
  daysInCurrentState: number;
  dueDate: string | null;
  reviewDate: string | null;
}

function priorityRank(p: string): number {
  const m = /^P(\d+)$/.exec(p);
  return m && m[1] ? Number(m[1]) : 99;
}

/**
 * AC12 — the unified CEO Attention Queue: one query returning every work row in
 * an attention state (needs-completion · awaiting-approval · awaiting-CEO-input
 * · blocked · overdue), project_slug-scoped, ordered by priority then by how
 * long it has been stuck. Empty-state-valid: a fresh business yields [].
 */
export async function loadCeoAttentionQueue(projectSlug?: string): Promise<AttentionItem[]> {
  const supa = getSupabaseAdmin();
  let workQ = supa.from('assigned_work').select(WORK_COLUMNS);
  if (projectSlug) workQ = workQ.eq('project_slug', projectSlug);
  const { data: work, error } = await workQ;
  if (error) throw new Error(error.message);
  // WORK_COLUMNS is a runtime string, so PostgREST can't infer the row shape.
  const rows = (work ?? []) as unknown as AssignedWorkRow[];

  // L34: which instruction-sourced work is awaiting a CEO answer.
  let instrQ = supa
    .from('direct_instructions')
    .select('linked_assigned_work_id')
    .eq('awaiting_ceo_input', true);
  if (projectSlug) instrQ = instrQ.eq('project_slug', projectSlug);
  const { data: awaiting } = await instrQ;
  const awaitingWorkIds = new Set(
    (awaiting ?? [])
      .map((a: { linked_assigned_work_id: string | null }) => a.linked_assigned_work_id)
      .filter((x: string | null): x is string => Boolean(x)),
  );

  const now = nowISO();
  const items: AttentionItem[] = [];
  for (const r of rows) {
    const { state, aging } = classifyWork(toStateRow(r, awaitingWorkIds.has(r.id)), now);
    if (!isAttentionState(state)) continue;
    items.push({
      id: r.id,
      projectSlug: r.project_slug,
      sourceType: r.source_type,
      sourceId: r.source_id,
      ownerExecutiveId: r.owner_executive_id,
      title: r.title,
      priority: r.priority,
      state,
      ageDays: aging.ageDays,
      daysInCurrentState: aging.daysInCurrentState,
      dueDate: r.due_date,
      reviewDate: r.review_date,
    });
  }

  items.sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      b.daysInCurrentState - a.daysInCurrentState,
  );
  return items;
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
