import { redirect } from 'next/navigation';

/**
 * D065 · P056-v2 — Legacy /projects RETIRED (L18).
 *
 * The portfolio surface is now the registry-driven Businesses screen. The old
 * /projects page read the legacy `projects` table; it is replaced by
 * /businesses (project_definitions + funnel + health). This permanent redirect
 * keeps any existing bookmarks / inbound links alive with no dead ends. The
 * per-business detail route (/projects/[slug]) is superseded by
 * /businesses/[slug] in the next v2 step.
 */
export default function LegacyProjectsRedirect() {
  redirect('/businesses');
}
