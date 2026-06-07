import type {
  Objective,
  ObjectiveHealth,
  ObjectiveOutcome,
  Task,
} from '@ai-company/shared-types';

/**
 * How many days an outcome may go without a fresh measurement before it
 * downgrades the parent objective to `at_risk`. Kept here as a constant
 * for Phase 1; Phase 2+ may move it onto GovernancePolicy.
 */
export const STALENESS_DAYS = 7;

/**
 * Compute objective health from its outcomes and tasks. Deterministic,
 * pure, no I/O. Health is NEVER stored — always derived (see [[D017]]).
 *
 * Rules, evaluated in order; first match wins:
 *   1. status in {'at_risk','blocked'} → critical (CEO already flagged)
 *      OR any outcome.status='failed'                → critical
 *      OR any task.status='blocked'                  → critical
 *   2. any outcome.lastMeasuredAt older than STALENESS_DAYS
 *      OR any task overdue (dueAt < now and status != 'completed') → at_risk
 *   3. otherwise → healthy
 */
export function computeObjectiveHealth(
  objective: Pick<Objective, 'status'>,
  outcomes: ObjectiveOutcome[],
  tasks: Task[],
  nowMs: number = Date.now(),
): ObjectiveHealth {
  if (objective.status === 'at_risk' || objective.status === 'blocked') {
    return 'critical';
  }
  if (outcomes.some((o) => o.status === 'failed')) return 'critical';
  if (tasks.some((t) => t.status === 'blocked')) return 'critical';

  const stalenessMs = STALENESS_DAYS * 24 * 60 * 60 * 1000;
  const someOutcomeStale = outcomes.some((o) => {
    if (!o.lastMeasuredAt) return false; // never measured isn't stale
    return nowMs - new Date(o.lastMeasuredAt).getTime() > stalenessMs;
  });
  if (someOutcomeStale) return 'at_risk';

  const someTaskOverdue = tasks.some((t) => {
    if (!t.dueAt) return false;
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    return new Date(t.dueAt).getTime() < nowMs;
  });
  if (someTaskOverdue) return 'at_risk';

  return 'healthy';
}
