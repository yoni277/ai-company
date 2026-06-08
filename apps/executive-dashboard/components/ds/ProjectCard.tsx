/**
 * D061 / P056.2.8 — ProjectCard  [HAVE / DERIVED]
 *
 * A registry project (project_definitions, read via GET /api/registry/projects)
 * with its DERIVED health. Per the locked contract the health is the funnel
 * engine's status mapped to the 3-state triad, with a 4th NEUTRAL "no signal"
 * for projects without a portfolio snapshot — so a zero-data registry renders
 * cleanly (empty-state-is-valid doctrine), never a fabricated "Healthy".
 *
 * Use `healthStateFromFunnel(funnelStatus)` (exported from StatusBadge) at the
 * call site to convert `'healthy'|'warning'|'critical'|null` → HealthState.
 */

import { Surface } from './Surface';
import { StatusBadge, type HealthState } from './StatusBadge';

export interface ProjectCardProps {
  name: string;
  slug: string;
  description?: string;
  /** Registry lifecycle status (active/inactive/archived). */
  lifecycle?: string;
  /** Derived health state (use healthStateFromFunnel at the call site). */
  health: HealthState;
  /** Optional custom health label (e.g. "Healthy: System Core"). */
  healthLabel?: string;
  bottleneck?: string | null;
  openRecommendations?: number;
  href?: string;
}

export function ProjectCard({
  name,
  slug,
  description,
  lifecycle,
  health,
  healthLabel,
  bottleneck,
  openRecommendations = 0,
  href,
}: ProjectCardProps) {
  const body = (
    <>
      <header className="flex items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-title-lg text-title-lg text-on-surface">{name}</h3>
          <p className="font-label-sm text-label-sm text-outline">{slug}</p>
        </div>
        <StatusBadge state={health} label={healthLabel} size="sm" />
      </header>

      {description ? (
        <p className="mt-sm line-clamp-2 font-body-md text-body-md text-on-surface-variant">
          {description}
        </p>
      ) : null}

      <dl className="mt-md flex flex-wrap gap-x-lg gap-y-sm">
        {lifecycle ? (
          <div>
            <dt className="font-label-sm text-label-sm uppercase text-outline">Status</dt>
            <dd className="font-body-md text-body-md text-on-surface">{lifecycle}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-label-sm text-label-sm uppercase text-outline">Open recs</dt>
          <dd className="font-body-md text-body-md text-on-surface">{openRecommendations}</dd>
        </div>
        {bottleneck ? (
          <div className="min-w-0">
            <dt className="font-label-sm text-label-sm uppercase text-outline">Bottleneck</dt>
            <dd className="truncate font-body-md text-body-md text-on-surface">{bottleneck}</dd>
          </div>
        ) : null}
      </dl>
    </>
  );

  if (href) {
    return (
      <Surface as="article" interactive className="block">
        <a href={href} className="block rounded-lg focus-visible:outline-none">
          {body}
        </a>
      </Surface>
    );
  }
  return (
    <Surface as="article" interactive>
      {body}
    </Surface>
  );
}
