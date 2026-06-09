/**
 * D061 / D065 · P056-v2 — Businesses (Wave 2, step 2).
 *
 * The portfolio surface: every enabled registry business at a glance. Registry-
 * driven (project_definitions + funnel + health via loadBusinesses) — it reads
 * the company registry, NEVER the legacy `projects` table, and REPLACES the
 * retired legacy /projects page (which now redirects here). Resolves L18.
 *
 * Server component, force-dynamic. RTL mirrors via logical CSS (chrome labels
 * localize in the shell; data comes from the registry). Empty-state-valid: a
 * registry with no enabled businesses renders a clean zero state, no auto-seed.
 */

import type { ReactNode } from 'react';
import { BusinessCard, StatusBadge } from '../../components/ds';
import { loadBusinesses } from '../../lib/executive-os';

export const dynamic = 'force-dynamic';

export default async function BusinessesPage() {
  const businesses = await loadBusinesses();

  const healthy = businesses.filter((b) => b.health === 'healthy').length;
  const attention = businesses.filter((b) => b.health === 'attention').length;
  const action = businesses.filter((b) => b.health === 'action').length;

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-6xl">
        <header className="mb-xl flex flex-wrap items-end justify-between gap-md">
          <div>
            <h1 className="font-display text-display text-on-surface">Businesses</h1>
            <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">
              Every active business at a glance — straight from the company registry.
            </p>
          </div>
          {businesses.length > 0 ? (
            <div className="flex flex-wrap items-center gap-sm">
              <StatusBadge state="healthy" label={`${healthy} healthy`} size="sm" />
              {attention > 0 ? (
                <StatusBadge state="attention" label={`${attention} needs attention`} size="sm" />
              ) : null}
              {action > 0 ? (
                <StatusBadge state="action" label={`${action} action required`} size="sm" />
              ) : null}
            </div>
          ) : null}
        </header>

        {businesses.length === 0 ? (
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-xl text-center">
            <p className="font-title-lg text-title-lg text-on-surface">No businesses registered yet</p>
            <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
              The company registry is empty. Register a business (seed the registry) and it will
              appear here — nothing is auto-created.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-3">
            {businesses.map((b) => (
              <BusinessCard
                key={b.slug}
                name={b.name}
                slug={b.slug}
                description={b.description}
                lifecycle={b.lifecycle}
                health={b.health}
                bottleneck={b.bottleneck}
                openRecommendations={b.openRecommendations}
                decisions={b.decisions}
                risks={b.risks}
                stages={b.stages}
                activeStageLabel={b.activeStageLabel}
                detailReady
                detailHref={`/businesses/${b.slug}`}
              />
            ))}
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}

function Footer(): ReactNode {
  return (
    <p className="mt-xl border-t border-outline-variant pt-lg text-center font-label-sm text-label-sm uppercase tracking-widest text-outline">
      Data from company registry · project_definitions
    </p>
  );
}
