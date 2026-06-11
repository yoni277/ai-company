/**
 * P1-3 — Priority integrity (generic, cloneable; no business specifics).
 *
 * The single place that validates a priority and assigns its sort rank. Every
 * ranking boundary must go through `priorityRank` / `validatePriority` instead
 * of a `Record<Priority, number>` lookup — a bare Record returns `undefined` for
 * an unknown value, and `undefined - undefined` is a silent `NaN` that corrupts
 * the sort order with no signal.
 *
 * Mirrors the existing explicit pattern at
 * `ai-chief-of-staff/src/task-generation.ts` (`{ ok:false, reason:'invalid-priority' }`):
 * an unknown priority is VALIDATED and REJECTED explicitly, raises a visible
 * warning, and leaves an audit-trail entry — never silently coerced to P2 or to
 * a silent NaN / arbitrary rank 99.
 */

export const KNOWN_PRIORITIES = ['P1', 'P2', 'P3'] as const;
export type Priority = (typeof KNOWN_PRIORITIES)[number];

const PRIORITY_RANK: Record<Priority, number> = { P1: 0, P2: 1, P3: 2 };

/**
 * Deterministic rank assigned to an INVALID priority. Explicit (= the count of
 * known priorities, so it sorts strictly AFTER every valid one), never `NaN`,
 * and never a silent magic `99`.
 */
export const INVALID_PRIORITY_RANK = KNOWN_PRIORITIES.length;

export function isKnownPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (KNOWN_PRIORITIES as readonly string[]).includes(value);
}

export interface PriorityValidation {
  ok: boolean;
  /** Sort rank — known → 0..2; invalid → INVALID_PRIORITY_RANK. Never NaN. */
  rank: number;
  /** Explicit reason on failure (the audit-trail content); null when ok. */
  reason: string | null;
  raw: string;
}

export function validatePriority(value: unknown): PriorityValidation {
  const raw = typeof value === 'string' ? value : String(value);
  if (isKnownPriority(value)) {
    return { ok: true, rank: PRIORITY_RANK[value], reason: null, raw };
  }
  return {
    ok: false,
    rank: INVALID_PRIORITY_RANK,
    reason: `invalid-priority: '${raw}' is not one of ${KNOWN_PRIORITIES.join('|')}`,
    raw,
  };
}

/**
 * Deterministic rank for ANY input — never `NaN`. Use this at every ranking
 * boundary instead of a Record lookup. Unknown values sort last (explicitly).
 */
export function priorityRank(value: unknown): number {
  return validatePriority(value).rank;
}

export interface PriorityAuditItem {
  priority: unknown;
  /** Optional label so the audit entry points at the offending record. */
  label?: string;
}

/**
 * Validate a batch of priorities at a ranking boundary. Returns the explicit
 * warning text for every invalid value (the audit-trail entries) AND emits a
 * visible `console.warn` for each — no silent coercion. Pure apart from the
 * diagnostic warn; callers may also surface the returned list on their output.
 */
export function auditPriorities(items: ReadonlyArray<PriorityAuditItem>): string[] {
  const warnings: string[] = [];
  for (const item of items) {
    const res = validatePriority(item.priority);
    if (!res.ok) {
      const entry = item.label ? `${res.reason} (at ${item.label})` : res.reason!;
      warnings.push(entry);
      // eslint-disable-next-line no-console
      console.warn(`priority-integrity: ${entry}`);
    }
  }
  return warnings;
}
