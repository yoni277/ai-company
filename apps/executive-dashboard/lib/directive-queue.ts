import 'server-only';
import {
  getDirectiveResponder,
  listRegisteredResponders,
} from '@ai-company/ai-chief-of-staff';
import { getPlatform } from './platform';
import { listActiveDirectives, getDirectiveById } from './ceo-operating-system';
import { emitDirectiveSpine, type DirectiveSpineResult } from './executive-os/directive-spine';

/**
 * Insert (or reset to pending) one directive_responses row per executive.
 * Idempotent on (directive_id, executive_id) — re-runs of the same fan-out
 * mutate the row in place rather than appending. Wraps the repo layer with
 * no dispatch logic: the queue knows only ids.
 */
export async function enqueueResponses(
  directiveId: string,
  executiveIds: string[],
): Promise<void> {
  if (executiveIds.length === 0) return;
  const { repos } = getPlatform();
  await repos.directiveResponses.enqueue(
    executiveIds.map((executiveId) => ({ directiveId, executiveId })),
  );
}

export interface DrainResult {
  directiveId: string;
  attempted: number;
  done: number;
  error: number;
  skipped: number;
  details: Array<{
    executiveId: string;
    status: 'done' | 'error' | 'skipped';
    executiveReportId?: string;
    errorMessage?: string;
  }>;
  /**
   * EPIC-004A — the spine emission for this directive (Phase 1). Present once
   * fan-out has produced task_proposals; the CEO approves the proposed work
   * through the ceo_decisions gate afterwards.
   */
  spine?: DirectiveSpineResult;
}

/**
 * Drain all pending rows for one directive inside the calling request thread.
 *
 * Two guarantees the previous `after()` approach did not have:
 *   1. Persistence — every transition writes to directive_responses so the
 *      UI sees real progress, not "Working…" forever.
 *   2. Survival — the response is not sent until each responder has either
 *      written its report or errored. The Next dev runtime cannot cut a
 *      worker that has not yielded the response yet.
 *
 * Dispatch goes through DirectiveResponderRegistry — no executive-specific
 * branching here. Unknown ids are marked 'skipped' (e.g. a directive
 * references an executive whose package isn't installed in this instance).
 */
export async function drainDirective(directiveId: string): Promise<DrainResult> {
  const { repos } = getPlatform();
  const directive = await getDirectiveById(directiveId);
  if (!directive) {
    throw new Error(`Directive ${directiveId} not found`);
  }

  // Snapshot active directives once so each responder sees the same context.
  const activeDirectives = await listActiveDirectives();

  const pending = await repos.directiveResponses.listByDirectiveAndStatus(
    directiveId,
    'pending',
  );

  const details: DrainResult['details'] = [];

  // Process in parallel — each call is an independent LLM round-trip. The
  // response is held open until every Promise resolves, so the runtime
  // cannot cut us mid-flight as it did with after().
  await Promise.allSettled(
    pending.map(async (row) => {
      const responder = getDirectiveResponder(row.executiveId);
      if (!responder) {
        await repos.directiveResponses.update(row.id, {
          status: 'error',
          errorMessage: `No responder registered for executive '${row.executiveId}'. Registered: [${listRegisteredResponders().join(', ')}]`,
        });
        details.push({
          executiveId: row.executiveId,
          status: 'skipped',
          errorMessage: 'unregistered',
        });
        return;
      }

      // Mark running before calling so the UI can show in-flight state.
      await repos.directiveResponses.update(row.id, { status: 'running' });

      try {
        const reportId = await responder.run(repos, directive, activeDirectives);
        await repos.directiveResponses.update(row.id, {
          status: 'done',
          executiveReportId: reportId,
          errorMessage: null,
        });
        details.push({
          executiveId: row.executiveId,
          status: 'done',
          executiveReportId: reportId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await repos.directiveResponses.update(row.id, {
          status: 'error',
          errorMessage: message,
        });
        details.push({
          executiveId: row.executiveId,
          status: 'error',
          errorMessage: message,
        });
      }
    }),
  );

  // EPIC-004A Phase 1 — converge the directive onto the work spine. The
  // responders have now written their task_proposals; emit assigned_work
  // (proposed) for each. Idempotent, so re-drains do not duplicate. Never let a
  // spine hiccup mask the fan-out result — surface it, don't throw.
  let spine: DirectiveSpineResult | undefined;
  try {
    spine = await emitDirectiveSpine(directiveId);
  } catch {
    spine = undefined;
  }

  return {
    directiveId,
    attempted: pending.length,
    done: details.filter((d) => d.status === 'done').length,
    error: details.filter((d) => d.status === 'error').length,
    skipped: details.filter((d) => d.status === 'skipped').length,
    details,
    ...(spine ? { spine } : {}),
  };
}
