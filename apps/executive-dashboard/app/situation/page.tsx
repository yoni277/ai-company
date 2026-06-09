/**
 * EPIC-004 Phase 5 — CEO Situation Room (`/situation`).
 *
 * Read-on-load (live each visit, no snapshot). Server-loads the composed,
 * project_slug-scoped summary, then hands off to the locale-aware client view.
 * Per-business: defaults to the active business; the selector switches. The Room
 * is read-only — every "act" link lands in /work. Empty-state-valid.
 */

import { loadSituationRoom } from '../../lib/executive-os/situation-room';
import { listBusinessSlugs } from '../../lib/executive-os/meetings';
import { SituationView } from '../../components/executive-os/situation/SituationView';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SituationRoomPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const businesses = await listBusinessSlugs();
  // Default to the active business (spec); the selector switches.
  const requested = one(sp.project_slug);
  const effectiveSlug = requested ?? businesses[0]?.slug;

  const situation = await loadSituationRoom(effectiveSlug);

  return (
    <div className="ds-surface min-h-screen rounded-lg px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-6xl">
        <SituationView situation={situation} businesses={businesses} currentSlug={effectiveSlug ?? null} />
      </div>
    </div>
  );
}
