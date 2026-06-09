/**
 * EPIC-004 Phase 4 — Work Control Center (`/work`).
 *
 * The CEO's control surface over the converged assigned_work spine. Server-loads
 * the project_slug-scoped attention queue + master list (filters drive the URL,
 * so scoping happens at the DB — no cross-business bleed), then hands off to the
 * locale-aware client board. Empty-state-valid.
 */

import { loadCeoAttentionQueue, loadWorkMasterList, type WorkListFilters } from '../../lib/executive-os/work-control';
import { listBusinessSlugs } from '../../lib/executive-os/meetings';
import { WorkBoard } from '../../components/executive-os/work/WorkBoard';
import { WorkFilters } from '../../components/executive-os/work/WorkFilters';
import type { WorkState } from '../../lib/executive-os/work-state';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function WorkControlCenterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const projectSlug = one(sp.project_slug);
  const state = one(sp.state) as WorkState | undefined;

  const filters: WorkListFilters = {
    ...(projectSlug ? { projectSlug } : {}),
    ...(one(sp.owner) ? { ownerExecutiveId: one(sp.owner)! } : {}),
    ...(one(sp.source_type) ? { sourceType: one(sp.source_type)! } : {}),
    ...(one(sp.priority) ? { priority: one(sp.priority)! } : {}),
    ...(one(sp.due_before) ? { dueBefore: one(sp.due_before)! } : {}),
    ...(state ? { states: [state] } : {}),
    ...(one(sp.waiting_on_ceo) === '1' ? { waitingOnCeo: true } : {}),
    ...(one(sp.blocked) === '1' ? { blocked: true } : {}),
  };

  const [attention, work, businesses] = await Promise.all([
    loadCeoAttentionQueue(projectSlug),
    loadWorkMasterList(filters),
    listBusinessSlugs(),
  ]);

  return (
    <div className="ds-surface min-h-screen rounded-lg px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-7xl">
        <WorkBoard attention={attention} work={work} filters={<WorkFilters businesses={businesses} />} />
      </div>
    </div>
  );
}
