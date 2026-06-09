/**
 * EPIC-004A — Work Model Convergence (D079). Spec §4 Phase 2 / §5.
 *
 * The PURE control logic over the assigned_work spine — no IO, no `server-only`,
 * no Supabase. Deliberately separated from work-control.ts (the Supabase
 * adapter) so the three invariants can be permanently regression-locked by unit
 * tests:
 *
 *   (1) No work reaches `approved` without a ceo_decisions row (the gate).
 *   (2) No work ACTIVATES (→approved) without an owner AND a date present
 *       (due_date or review_date) — else NeedsCeoCompletionError (AC2).
 *   (3) Every approval/execution transition stamps status_changed_at = now()
 *       in the same write (AC13).
 *
 * Collaboration with the database is expressed through the WorkSpineStore port,
 * so tests pass a fake store + fixed clock and assert the orchestration without
 * a live DB.
 *
 * Cloneable: zero business specifics, project_slug-scoped, generic entities.
 */

import {
  classifyWork,
  isAttentionState,
  type WorkRowForState,
  type WorkState,
} from './work-state';

/** Thrown when an approval is attempted on work missing an owner or a date. */
export class NeedsCeoCompletionError extends Error {
  readonly code = 'NEEDS_CEO_COMPLETION';
  constructor(message: string) {
    super(message);
    this.name = 'NeedsCeoCompletionError';
  }
}

/**
 * The gate that protects activation (AC1/AC2). Throws NeedsCeoCompletionError
 * when the row cannot honestly be approved. Batch callers (meeting approval)
 * catch this per-row and skip rather than failing the whole batch.
 */
export function assertApprovable(row: {
  owner_executive_id: string | null;
  due_date: string | null;
  review_date: string | null;
}): void {
  const missingOwner = !row.owner_executive_id;
  const missingDate = !row.due_date && !row.review_date;
  if (missingOwner || missingDate) {
    const missing = [
      missingOwner ? 'an owner' : null,
      missingDate ? 'a date or review checkpoint' : null,
    ]
      .filter(Boolean)
      .join(' and ');
    throw new NeedsCeoCompletionError(
      `Needs CEO completion: set ${missing} before this work can be approved.`,
    );
  }
}

/* ----------------------------------------------------------------------------
 * The store port — the only surface the orchestration touches.
 * -------------------------------------------------------------------------- */

export interface ApprovableWork {
  id: string;
  projectSlug: string;
  title: string;
  detail: string | null;
  ownerExecutiveId: string | null;
  approvalStatus: string;
  dueDate: string | null;
  reviewDate: string | null;
}

export interface DecisionRequest {
  projectId: string | null;
  decisionTitle: string;
  decisionDescription: string | null;
  owner: string | null;
  dueDate: string | null;
  notes?: string;
}

export type ExecutionStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

export interface WorkSpineStore {
  /** Single clock for every status stamp. */
  now(): string;
  getApprovable(workId: string): Promise<ApprovableWork | null>;
  createDecision(input: DecisionRequest): Promise<{ id: string }>;
  /** Flip proposed→approved + link decision + stamp status_changed_at=at. */
  markApproved(workId: string, decisionId: string, at: string): Promise<void>;
  /** Flip proposed→rejected + stamp status_changed_at=at. */
  markRejected(workId: string, at: string): Promise<void>;
  /** Set execution_status + stamp status_changed_at=at (optional optimistic guard). */
  setExecution(
    workId: string,
    to: ExecutionStatus,
    at: string,
    expectFrom?: string,
  ): Promise<void>;
}

export interface ApproveResult {
  workId: string;
  decisionId: string;
  statusChangedAt: string;
}

/**
 * Approve a single work row through the ceo_decisions gate. Generic across
 * source_type. Enforces the activation gate, writes the decision, flips
 * proposed→approved, stamps status_changed_at. Idempotent: only acts while the
 * row is still `proposed`.
 */
export async function approveWork(
  store: WorkSpineStore,
  workId: string,
  opts?: { notes?: string },
): Promise<ApproveResult> {
  const row = await store.getApprovable(workId);
  if (!row) throw new Error('assigned_work not found');
  if (row.approvalStatus !== 'proposed') {
    throw new Error(`work is '${row.approvalStatus}', not awaiting approval`);
  }

  assertApprovable({
    owner_executive_id: row.ownerExecutiveId,
    due_date: row.dueDate,
    review_date: row.reviewDate,
  });

  const decision = await store.createDecision({
    projectId: row.projectSlug,
    decisionTitle: row.title,
    decisionDescription: row.detail ?? null,
    owner: row.ownerExecutiveId ?? null,
    dueDate: row.dueDate ?? null,
    ...(opts?.notes ? { notes: opts.notes } : {}),
  });

  const at = store.now();
  await store.markApproved(workId, decision.id, at);
  return { workId, decisionId: decision.id, statusChangedAt: at };
}

/** Reject a proposed work row. Always stamps status_changed_at. */
export async function rejectWork(
  store: WorkSpineStore,
  workId: string,
): Promise<{ statusChangedAt: string }> {
  const at = store.now();
  await store.markRejected(workId, at);
  return { statusChangedAt: at };
}

/**
 * Transition execution_status (open → in_progress → blocked/done/cancelled).
 * The ONLY supported mutation of execution_status — always stamps
 * status_changed_at so aging stays correct.
 */
export async function setWorkExecutionStatus(
  store: WorkSpineStore,
  workId: string,
  to: ExecutionStatus,
  opts?: { expectFrom?: string },
): Promise<{ statusChangedAt: string }> {
  const at = store.now();
  await store.setExecution(workId, to, at, opts?.expectFrom);
  return { statusChangedAt: at };
}

/* ----------------------------------------------------------------------------
 * Pure attention-queue assembly (AC12). Read-side, no IO.
 * -------------------------------------------------------------------------- */

export interface AttentionSourceRow {
  id: string;
  projectSlug: string;
  sourceType: string;
  sourceId: string;
  ownerExecutiveId: string | null;
  title: string;
  priority: string;
  approvalStatus: string;
  executionStatus: string;
  dueDate: string | null;
  reviewDate: string | null;
  createdAt: string;
  statusChangedAt: string;
}

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

function toStateRow(r: AttentionSourceRow, awaitingCeoInput: boolean): WorkRowForState {
  return {
    approvalStatus: r.approvalStatus,
    executionStatus: r.executionStatus,
    dueDate: r.dueDate,
    reviewDate: r.reviewDate,
    createdAt: r.createdAt,
    statusChangedAt: r.statusChangedAt,
    awaitingCeoInput,
  };
}

/**
 * Build the unified CEO attention queue from already-fetched rows: classify,
 * keep only attention states, order by priority then days-stuck. Pure — the
 * Supabase adapter does the fetching and passes rows + the awaiting set in.
 */
export function assembleAttentionQueue(
  rows: AttentionSourceRow[],
  awaitingWorkIds: ReadonlySet<string>,
  now: string,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const r of rows) {
    const { state, aging } = classifyWork(toStateRow(r, awaitingWorkIds.has(r.id)), now);
    if (!isAttentionState(state)) continue;
    items.push({
      id: r.id,
      projectSlug: r.projectSlug,
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      ownerExecutiveId: r.ownerExecutiveId,
      title: r.title,
      priority: r.priority,
      state,
      ageDays: aging.ageDays,
      daysInCurrentState: aging.daysInCurrentState,
      dueDate: r.dueDate,
      reviewDate: r.reviewDate,
    });
  }
  items.sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      b.daysInCurrentState - a.daysInCurrentState,
  );
  return items;
}
