/**
 * P008 — Outcome Attribution types.
 *
 * Doctrine (Chief Architect 2026-06-05):
 *   - Outcome ≠ Evidence. Distinct shape, distinct repository.
 *   - Measurable only — numeric baseline + observed + computed delta.
 *   - Time-bound — observedAt strictly inside [windowStart, windowEnd].
 *   - Attaches to task first (no project/objective/company rollup at v1).
 *   - AI cannot generate — source restricted to manual / connector / measured.
 *   - Append-only — no Update or Delete shape exists in this file by design.
 */

/** Where the number came from. */
export type OutcomeSource = 'manual' | 'connector_metric' | 'verified_measurement';

/**
 * Operator's claim about which way the number moved. Validated against the
 * math (observedValue vs baselineValue) — operator can't lie about direction.
 */
export type OutcomeDirection = 'increase' | 'decrease' | 'unchanged';

/** Persisted shape — one row in `ai_company.task_outcomes`. */
export interface TaskOutcome {
  id: string;
  createdAt: string;
  updatedAt: string;
  taskId: string;
  /** Deterministic identifier-style name. Regex enforced: /^[a-z][a-z0-9_]*$/ */
  metricName: string;
  /** Free text at v1. Closed vocabulary deferred to v2 (Chief Architect Q4). */
  metricUnit: string | null;
  baselineValue: number;
  observedValue: number;
  /** DB-computed: observedValue - baselineValue. Generated column. */
  delta: number;
  direction: OutcomeDirection;
  observedAt: string;
  windowStart: string;
  windowEnd: string;
  source: OutcomeSource;
  sourceRef: string | null;
  recordedBy: string;
  notes: string | null;
}

/**
 * Create-input. recordedBy is required and non-empty. No update or delete
 * counterpart — outcomes are append-only at v1 (Chief Architect 2026-06-05).
 */
export interface CreateTaskOutcomeInput {
  taskId: string;
  metricName: string;
  metricUnit?: string | null;
  baselineValue: number;
  observedValue: number;
  direction: OutcomeDirection;
  observedAt: string;
  windowStart: string;
  windowEnd: string;
  source: OutcomeSource;
  sourceRef?: string | null;
  recordedBy: string;
  notes?: string | null;
}
