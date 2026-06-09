/**
 * D061 / D065 · P056-v2 step 3 — Business Detail (/businesses/[slug]).
 *
 * One business, end-to-end: funnel · pending decisions · risk radar · results ·
 * connectors · evidence · timeline. All registry / HAVE / DERIVED
 * (v2-DATA-MAPPING.md) — funnel from project_funnel_stages, decisions/risks by
 * projectId, evidence/results via the directive→task chain, connector from
 * project_connector_configs, timeline a union of created_at. No new data model.
 *
 * Server component, force-dynamic. notFound() for an unknown/disabled slug.
 * Empty-state-valid: every section renders a clean zero state. Pending decisions
 * keep the 1-click Approve/Reject/Clarify via DecisionQueueItem.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RiskCard, StatusBadge, DataTag, ActivityFeed } from '../../../components/ds';
import { ChevronEndIcon } from '../../../components/ds/icons';
import { DecisionQueueItem } from '../../../components/executive-os/DecisionQueueItem';
import { loadBusinessDetail } from '../../../lib/executive-os';

export const dynamic = 'force-dynamic';

const SEGMENT: Record<'completed' | 'active' | 'upcoming', string> = {
  completed: 'bg-healthy',
  active: 'bg-primary',
  upcoming: 'bg-outline-variant',
};

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const biz = await loadBusinessDetail(slug);
  if (!biz) notFound();

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <Link
          href={'/businesses' as never}
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-xs font-label-md text-label-md text-primary hover:underline"
        >
          <ChevronEndIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
          Businesses
        </Link>
        <header className="mt-sm mb-xl flex flex-wrap items-start justify-between gap-md">
          <div className="min-w-0">
            <h1 className="font-display text-display text-on-surface">{biz.name}</h1>
            <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">{biz.description}</p>
            <p className="mt-xs font-label-sm text-label-sm uppercase text-outline">
              {biz.slug}{biz.lifecycle !== 'active' ? ` · ${biz.lifecycle}` : ''}
            </p>
          </div>
          <StatusBadge state={biz.health} />
        </header>

        {/* Funnel */}
        <Section title="Funnel">
          {biz.stages.length === 0 ? (
            <Empty>No funnel configured for this business.</Empty>
          ) : (
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
              <div className="flex gap-1.5">
                {biz.stages.map((s) => (
                  <span key={s.id} className={`h-1.5 flex-1 rounded-full ${SEGMENT[s.state]}`} title={s.label} />
                ))}
              </div>
              <div className="mt-sm flex flex-wrap justify-between gap-x-md gap-y-xs">
                <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                  {biz.activeStageLabel ? `Current: ${biz.activeStageLabel}` : 'Not started'}
                </span>
                {biz.bottleneck ? (
                  <span className="font-label-sm text-label-sm text-attention">Bottleneck: {biz.bottleneck}</span>
                ) : null}
              </div>
              <ol className="mt-md flex flex-wrap gap-x-md gap-y-xs">
                {biz.stages.map((s) => (
                  <li key={s.id} className="flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant">
                    <span className={`h-2 w-2 rounded-full ${SEGMENT[s.state]}`} />
                    {s.label}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Section>

        {/* Decisions + Risks */}
        <div className="grid gap-lg lg:grid-cols-2">
          <Section title="Pending Decisions" count={biz.counts.decisions}>
            {biz.decisions.length === 0 ? (
              <Empty>No decisions waiting for this business.</Empty>
            ) : (
              <div className="space-y-lg">
                {biz.decisions.map((d) => (
                  <DecisionQueueItem key={`${d.kind}-${d.id}`} item={d} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Risk Radar" count={biz.risks.length}>
            {biz.risks.length === 0 ? (
              <Empty>No open risks for this business.</Empty>
            ) : (
              <div className="space-y-lg">
                {biz.risks.map((r) => (
                  <RiskCard
                    key={r.id}
                    description={r.description}
                    severity={r.severity}
                    status={r.status}
                    recordedBy={r.recordedBy}
                    generation={r.generation}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Results + Connectors */}
        <div className="mt-xl grid gap-lg lg:grid-cols-2">
          <Section title="Results" count={biz.counts.results}>
            {biz.results.length === 0 ? (
              <Empty>No recorded outcomes yet.</Empty>
            ) : (
              <ul className="space-y-sm">
                {biz.results.map((o) => {
                  const up = o.delta > 0;
                  const flat = o.delta === 0;
                  return (
                    <li
                      key={o.id}
                      className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
                    >
                      <div className="flex items-center justify-between gap-sm">
                        <span className="font-body-md text-body-md text-on-surface">{o.metricName}</span>
                        <span
                          className={`font-label-md text-label-md ${flat ? 'text-outline' : up ? 'text-healthy' : 'text-action'}`}
                        >
                          {o.baselineValue} → {o.observedValue}
                          {o.metricUnit ? ` ${o.metricUnit}` : ''} ({o.delta > 0 ? '+' : ''}{o.delta})
                        </span>
                      </div>
                      <p className="mt-xs font-label-sm text-label-sm text-outline">
                        {o.direction} · {o.taskTitle}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Connectors">
            {!biz.connector ? (
              <Empty>No connector configured.</Empty>
            ) : (
              <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
                <div className="flex items-center justify-between gap-sm">
                  <span className="font-body-md text-body-md font-medium text-on-surface">
                    {biz.connector.type}
                  </span>
                  <StatusBadge
                    state={biz.connector.enabled ? 'healthy' : 'neutral'}
                    label={biz.connector.enabled ? 'Enabled' : 'Disabled'}
                    size="sm"
                  />
                </div>
                <p className="mt-sm font-label-sm text-label-sm text-on-surface-variant">
                  {biz.connector.liveCapable ? 'Live credentials present' : 'Mock / no live credentials'}
                </p>
              </div>
            )}
          </Section>
        </div>

        {/* Evidence */}
        <Section title="Evidence" count={biz.counts.evidence}>
          {biz.evidence.length === 0 ? (
            <Empty>No evidence tokens recorded for this business.</Empty>
          ) : (
            <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant bg-surface-container-lowest">
              {biz.evidence.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-sm p-md">
                  <span className="rounded-sm border border-outline-variant bg-surface-container px-sm py-[1px] font-label-sm text-label-sm uppercase text-on-surface-variant">
                    {e.tier}
                  </span>
                  <span className="font-body-md text-body-md text-on-surface">{e.evidenceKind}</span>
                  <span className="min-w-0 flex-1 truncate font-label-sm text-label-sm text-outline">
                    {e.taskTitle}
                  </span>
                  <StatusBadge
                    state={e.verified ? 'healthy' : 'neutral'}
                    label={e.verified ? 'Verified' : 'Unverified'}
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          {biz.timeline.length === 0 ? (
            <Empty>No activity recorded yet.</Empty>
          ) : (
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
              <ActivityFeed items={biz.timeline} pageSize={6} />
            </div>
          )}
        </Section>

        <p className="mt-xl border-t border-outline-variant pt-lg text-center font-label-sm text-label-sm uppercase tracking-widest text-outline">
          <DataTag kind="HAVE" /> <span className="ms-sm align-middle">Data from company registry</span>
        </p>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mb-xl">
      <h2 className="mb-md flex items-baseline gap-sm font-headline-md text-headline-md text-on-surface">
        {title}
        {typeof count === 'number' ? (
          <span className="font-label-sm text-label-sm text-outline">{count}</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="font-body-md text-body-md italic text-on-surface-variant">{children}</p>;
}
