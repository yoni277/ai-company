/**
 * OF-011 / D085 item 6 — Fan-out failure attention signal (PURE core).
 *
 * No IO, no 'server-only' — trivially unit-testable and importable from both the
 * server loader (directive-failures.ts) and render components. Mirrors the
 * work-control-core.ts / work-control.ts split.
 *
 * A directive fan-out target that errors (`directive_responses.status = 'error'`)
 * must be SURFACED to the CEO, never silently discarded. The directive detail
 * page already shows a per-responder rose badge; this lifts the same fact into
 * the cross-directive attention surfaces (/work, Situation Room) so the CEO
 * notices a failed responder WITHOUT opening every directive.
 *
 * Cloneable: zero business specifics, generic entities.
 */

export interface ResponderFailure {
  executiveId: string;
  errorMessage: string | null;
}

export interface DirectiveFanoutFailure {
  directiveId: string;
  title: string;
  failures: ResponderFailure[];
}

/** Minimal projections the pure selector needs. */
export interface DirectiveForFailure {
  id: string;
  title: string;
  active: boolean;
}
export interface ResponseForFailure {
  directiveId: string;
  executiveId: string;
  status: string;
  errorMessage: string | null;
  executiveReportId: string | null;
}

/**
 * Pure: group errored responders under their (active) directive. Inactive /
 * expired directives are excluded — a closed directive's past error is not an
 * open attention signal. Deterministic input order out.
 */
export function selectDirectiveFanoutFailures(
  directives: readonly DirectiveForFailure[],
  responses: readonly ResponseForFailure[],
): DirectiveFanoutFailure[] {
  const activeById = new Map<string, DirectiveForFailure>();
  for (const d of directives) if (d.active) activeById.set(d.id, d);

  const byDirective = new Map<string, ResponderFailure[]>();
  for (const r of responses) {
    if (r.status !== 'error') continue;
    if (!activeById.has(r.directiveId)) continue;
    const list = byDirective.get(r.directiveId) ?? [];
    list.push({ executiveId: r.executiveId, errorMessage: r.errorMessage });
    byDirective.set(r.directiveId, list);
  }

  const out: DirectiveFanoutFailure[] = [];
  for (const [directiveId, failures] of byDirective) {
    out.push({ directiveId, title: activeById.get(directiveId)!.title, failures });
  }
  return out;
}

/** Total count of failed responders across all failing directives. */
export function countResponderFailures(failures: readonly DirectiveFanoutFailure[]): number {
  return failures.reduce((n, f) => n + f.failures.length, 0);
}
