import { NextResponse } from 'next/server';
import { loadWorkMasterList, type WorkListFilters } from '../../../../lib/executive-os/work-control';
import type { WorkState } from '../../../../lib/executive-os/work-state';

export const dynamic = 'force-dynamic';

/**
 * EPIC-004 Phase 4 (WCC) — AC7 master work list. Reads ONLY the converged
 * assigned_work spine via the EPIC-004A selectors (classify + aging). Every
 * filter is project_slug-scoped; empty business → { work: [] }.
 *
 * Query params (all optional, compose):
 *   project_slug · owner (executive id) · source_type (directive|meeting|instruction)
 *   priority (P1…) · approval_status · execution_status
 *   due_before · due_after (YYYY-MM-DD)
 *   state (repeatable derived-state filter) · waiting_on_ceo=1 · blocked=1
 */
export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const states = sp.getAll('state').filter(Boolean) as WorkState[];

    const filters: WorkListFilters = {
      ...(sp.get('project_slug') ? { projectSlug: sp.get('project_slug')! } : {}),
      ...(sp.get('owner') ? { ownerExecutiveId: sp.get('owner')! } : {}),
      ...(sp.get('source_type') ? { sourceType: sp.get('source_type')! } : {}),
      ...(sp.get('priority') ? { priority: sp.get('priority')! } : {}),
      ...(sp.get('approval_status') ? { approvalStatus: sp.get('approval_status')! } : {}),
      ...(sp.get('execution_status') ? { executionStatus: sp.get('execution_status')! } : {}),
      ...(sp.get('due_before') ? { dueBefore: sp.get('due_before')! } : {}),
      ...(sp.get('due_after') ? { dueAfter: sp.get('due_after')! } : {}),
      ...(states.length > 0 ? { states } : {}),
      ...(sp.get('waiting_on_ceo') === '1' ? { waitingOnCeo: true } : {}),
      ...(sp.get('blocked') === '1' ? { blocked: true } : {}),
    };

    const work = await loadWorkMasterList(filters);
    return NextResponse.json({ work, count: work.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load work list' },
      { status: 500 },
    );
  }
}
