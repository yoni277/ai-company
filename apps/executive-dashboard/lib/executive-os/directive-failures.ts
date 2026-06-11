import 'server-only';

/**
 * OF-011 / D085 item 6 — Fan-out failure attention signal (server loader).
 *
 * Binds the pure selector (directive-failures-core.ts) to the admin client.
 * Read-only; empty-state valid (no failures → []).
 */

import { getSupabaseAdmin } from '../doos/supabase-admin';
import {
  selectDirectiveFanoutFailures,
  type DirectiveFanoutFailure,
} from './directive-failures-core';

export {
  selectDirectiveFanoutFailures,
  countResponderFailures,
} from './directive-failures-core';
export type {
  DirectiveFanoutFailure,
  ResponderFailure,
  DirectiveForFailure,
  ResponseForFailure,
} from './directive-failures-core';

/**
 * Load active directives that have ≥1 errored responder. Read-only; empty-state
 * valid (no failures → []).
 */
export async function loadDirectiveFanoutFailures(): Promise<DirectiveFanoutFailure[]> {
  const supa = getSupabaseAdmin();

  const { data: dirs, error: dErr } = await supa
    .from('ceo_directives')
    .select('id, title, active')
    .eq('active', true);
  if (dErr) throw new Error(dErr.message);

  const activeIds = (dirs ?? []).map((d: { id: string }) => d.id);
  if (activeIds.length === 0) return [];

  const { data: resp, error: rErr } = await supa
    .from('directive_responses')
    .select('directive_id, executive_id, status, error_message, executive_report_id')
    .eq('status', 'error')
    .in('directive_id', activeIds);
  if (rErr) throw new Error(rErr.message);

  return selectDirectiveFanoutFailures(
    (dirs ?? []).map((d: { id: string; title: string; active: boolean }) => ({
      id: d.id,
      title: d.title,
      active: d.active,
    })),
    (resp ?? []).map(
      (r: {
        directive_id: string;
        executive_id: string;
        status: string;
        error_message: string | null;
        executive_report_id: string | null;
      }) => ({
        directiveId: r.directive_id,
        executiveId: r.executive_id,
        status: r.status,
        errorMessage: r.error_message,
        executiveReportId: r.executive_report_id,
      }),
    ),
  );
}
