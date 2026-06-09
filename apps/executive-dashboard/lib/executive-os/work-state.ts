/**
 * EPIC-004A — Work Model Convergence (D079). Spec §4 Phase 2(b) / §5 AC9, AC12, AC13.
 *
 * The SINGLE shared classifier for an assigned_work row. Pure (no IO) so it is
 * trivially testable and reusable across every surface (CEO attention queue,
 * executive desktop, situation room) without duplicating the truth of "what
 * state is this work in." Every reader classifies the SAME way.
 *
 * Cloneable: zero business specifics, project_slug-agnostic, generic entities.
 */

/** All terminal states a work row can resolve to. */
export type WorkState =
  | 'needs_ceo_completion' // proposed AND dateless (due_date & review_date both null) — CEO must finish it
  | 'awaiting_approval' // proposed AND dated — sitting in the ceo_decisions gate
  | 'awaiting_ceo_input' // executive asked a clarifying question (L34) — blocked on a CEO answer
  | 'blocked' // execution_status = 'blocked'
  | 'overdue' // approved/active, past its due/review date, not done
  | 'in_progress' // approved AND execution_status = 'in_progress'
  | 'open' // approved AND execution_status = 'open', not yet started, on-track
  | 'done' // execution_status = 'done'
  | 'cancelled' // execution_status = 'cancelled'
  | 'rejected'; // approval_status = 'rejected'

/**
 * The five states that demand the CEO's attention (AC12). The attention queue
 * is exactly the union of these over the spine.
 */
export const ATTENTION_STATES: readonly WorkState[] = [
  'needs_ceo_completion',
  'awaiting_approval',
  'awaiting_ceo_input',
  'blocked',
  'overdue',
] as const;

export function isAttentionState(state: WorkState): boolean {
  return (ATTENTION_STATES as readonly string[]).includes(state);
}

/** Minimal projection of an assigned_work row needed to classify it. */
export interface WorkRowForState {
  approvalStatus: string; // 'proposed' | 'approved' | 'rejected' | 'not_required'
  executionStatus: string; // 'open' | 'in_progress' | 'blocked' | 'done' | 'cancelled'
  dueDate: string | null; // 'YYYY-MM-DD'
  reviewDate: string | null; // 'YYYY-MM-DD'
  createdAt: string; // ISO timestamptz
  statusChangedAt: string; // ISO timestamptz — entry time of the CURRENT state (AC13)
  /** L34: the linked direct_instruction is awaiting a CEO answer. Default false. */
  awaitingCeoInput?: boolean;
}

export interface WorkAging {
  /** Whole days since the row was created (now − created_at). */
  ageDays: number;
  /**
   * Whole days the row has sat in its CURRENT state (now − status_changed_at).
   * This is the "what's stuck right now" signal — Days Waiting / Days Blocked /
   * Days Waiting-for-CEO. NOT cumulative (that needs a transition log — deferred).
   */
  daysInCurrentState: number;
}

export interface WorkClassification {
  state: WorkState;
  aging: WorkAging;
  /** True when due_date OR review_date is set (the AC2 "date present" test). */
  hasDate: boolean;
}

/** A work row has a "date present" when either a hard due date or a review checkpoint exists. */
export function hasDate(row: Pick<WorkRowForState, 'dueDate' | 'reviewDate'>): boolean {
  return Boolean(row.dueDate) || Boolean(row.reviewDate);
}

const DAY_MS = 86_400_000;

function wholeDaysBetween(fromISO: string, toISO: string): number {
  const from = Date.parse(fromISO);
  const to = Date.parse(toISO);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / DAY_MS));
}

/**
 * The effective date a row is measured against for "overdue": a hard due_date
 * if present, else the review checkpoint. Returns null when dateless.
 */
function effectiveDate(row: Pick<WorkRowForState, 'dueDate' | 'reviewDate'>): string | null {
  return row.dueDate ?? row.reviewDate ?? null;
}

/**
 * Classify a single work row at instant `nowISO`. Priority order matters:
 * terminal execution states first, then the proposed/approval gate, then the
 * active-work attention signals. Every branch returns exactly one state.
 */
export function classifyWork(row: WorkRowForState, nowISO: string): WorkClassification {
  const aging: WorkAging = {
    ageDays: wholeDaysBetween(row.createdAt, nowISO),
    daysInCurrentState: wholeDaysBetween(row.statusChangedAt, nowISO),
  };
  const dated = hasDate(row);
  const result = (state: WorkState): WorkClassification => ({ state, aging, hasDate: dated });

  // Terminal execution outcomes win over everything.
  if (row.executionStatus === 'cancelled') return result('cancelled');
  if (row.executionStatus === 'done') return result('done');

  // Rejected at the gate.
  if (row.approvalStatus === 'rejected') return result('rejected');

  // Still in the approval gate.
  if (row.approvalStatus === 'proposed') {
    // Dateless proposed work is the derived "Needs CEO Completion" state — never
    // silent: the CEO must set an owner/date before it can activate (AC2).
    return result(dated ? 'awaiting_approval' : 'needs_ceo_completion');
  }

  // Approved / not_required and live. Surface the attention signals.
  if (row.awaitingCeoInput) return result('awaiting_ceo_input');
  if (row.executionStatus === 'blocked') return result('blocked');

  const due = effectiveDate(row);
  if (due) {
    const today = nowISO.slice(0, 10);
    if (due < today) return result('overdue');
  }

  if (row.executionStatus === 'in_progress') return result('in_progress');
  return result('open');
}
