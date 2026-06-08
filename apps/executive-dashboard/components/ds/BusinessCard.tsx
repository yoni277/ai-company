/**
 * D061 / D065 · P056-v2 — BusinessCard  [HAVE / DERIVED]
 *
 * The portfolio card for a registry business (project_definitions + funnel +
 * health). Evolves ProjectCard for the v2 Businesses screen: adds the funnel
 * mini-bar (real project_funnel_stages) and the decisions/risks/open-recs metric
 * tiles. Health uses StatusBadge (glyph + color + text). Funnel segment colors
 * reuse v1 tokens — completed=healthy(emerald), active=primary(#004AC6),
 * upcoming=neutral — so no new green token is needed.
 *
 * "View" is disabled until Business Detail (/businesses/[slug]) ships next — an
 * honest "Detail soon" rather than a dead link.
 */

import { StatusBadge, DataTag, type HealthState } from './StatusBadge';
import { BusinessIcon, ChevronEndIcon } from './icons';

export interface BusinessFunnelStageView {
  id: string;
  label: string;
  state: 'completed' | 'active' | 'upcoming';
}

const SEGMENT: Record<BusinessFunnelStageView['state'], string> = {
  completed: 'bg-healthy',
  active: 'bg-primary',
  upcoming: 'bg-outline-variant',
};

export interface BusinessCardProps {
  name: string;
  slug: string;
  description?: string;
  lifecycle?: string;
  health: HealthState;
  healthLabel?: string | undefined;
  bottleneck?: string | null;
  openRecommendations?: number;
  decisions?: number;
  risks?: number;
  stages?: BusinessFunnelStageView[];
  activeStageLabel?: string | null;
  detailReady?: boolean;
  detailHref?: string;
}

function Tile({ label, value, tone = 'text-on-surface' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded border border-outline-variant/40 bg-surface-container-low p-sm text-center">
      <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">{label}</p>
      <p className={`font-display text-headline-md ${tone}`}>{value}</p>
    </div>
  );
}

export function BusinessCard({
  name,
  slug,
  description,
  lifecycle,
  health,
  healthLabel,
  bottleneck,
  openRecommendations = 0,
  decisions = 0,
  risks = 0,
  stages = [],
  activeStageLabel,
  detailReady = false,
  detailHref,
}: BusinessCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest transition hover:shadow-ambient">
      <div className="flex-1 p-lg">
        <header className="flex items-start justify-between gap-md">
          <div className="flex min-w-0 gap-sm">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary-container/10 text-primary">
              <BusinessIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h3 className="font-title-lg text-title-lg font-bold text-on-surface">{name}</h3>
              {description ? (
                <p className="line-clamp-1 font-body-md text-body-md text-on-surface-variant">
                  {description}
                </p>
              ) : (
                <p className="font-label-sm text-label-sm text-outline">{slug}</p>
              )}
            </div>
          </div>
          <StatusBadge state={health} label={healthLabel} size="sm" />
        </header>

        {/* Funnel mini-bar */}
        {stages.length > 0 ? (
          <div className="mt-lg">
            <div className="flex gap-1">
              {stages.map((s) => (
                <span
                  key={s.id}
                  className={`h-1 flex-1 rounded-full ${SEGMENT[s.state]}`}
                  title={`${s.label} · ${s.state}`}
                />
              ))}
            </div>
            <div className="mt-xs flex justify-between gap-sm">
              <span className="truncate font-label-sm text-label-sm uppercase text-on-surface-variant">
                {activeStageLabel ?? 'Not started'}
              </span>
              {bottleneck ? (
                <span className="truncate font-label-sm text-label-sm text-attention">{bottleneck}</span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-lg font-label-sm text-label-sm italic text-outline">No funnel data yet.</p>
        )}

        {/* Metric tiles */}
        <div className="mt-md grid grid-cols-3 gap-sm">
          <Tile label="Decisions" value={decisions} />
          <Tile label="Risks" value={risks} tone={risks > 0 ? 'text-action' : 'text-on-surface'} />
          <Tile label="Open recs" value={openRecommendations} />
        </div>

        {lifecycle && lifecycle !== 'active' ? (
          <p className="mt-sm font-label-sm text-label-sm uppercase text-outline">{lifecycle}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low px-lg py-sm">
        <DataTag kind="HAVE" />
        {detailReady && detailHref ? (
          <a
            href={detailHref}
            className="inline-flex min-h-11 items-center gap-xs font-label-md text-label-md font-semibold text-primary hover:underline"
          >
            View business <ChevronEndIcon className="h-4 w-4 rtl:-scale-x-100" />
          </a>
        ) : (
          <span className="font-label-sm text-label-sm text-outline">Detail soon</span>
        )}
      </div>
    </article>
  );
}
