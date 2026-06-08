/**
 * D061 / D065 · P056-v2 step 6 — Results (/results).
 *
 * What the work produced. Two sections, both HAVE/DERIVED (v2-DATA-MAPPING.md):
 *  - Outcome cards from task_outcomes (title, business, delta, owner, date) —
 *    business resolved via the task → directive(targetProjectId) → project chain.
 *  - Objectives → measured outcomes from objective_outcomes (baseline → current
 *    toward target).
 * Plus derived highlight tiles. Aggregated server-side (repos expose per-task /
 * per-objective reads only) with an honest "showing X of Y" disclosure.
 *
 * Server component, force-dynamic. Empty-state-valid; RTL via logical CSS.
 */

import type { ReactNode } from 'react';
import { DataTag, StatusBadge } from '../../components/ds';
import { loadResults } from '../../lib/executive-os';

export const dynamic = 'force-dynamic';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export default async function ResultsPage() {
  const { cards, objectives, highlights, totalCards, shownCards, truncated } = await loadResults();
  const empty = cards.length === 0 && objectives.length === 0;

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-5xl">
        <header className="mb-xl">
          <h1 className="font-display text-display text-on-surface">Results</h1>
          <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">
            Measured outcomes — what moved, by how much, and against which objective.
          </p>
        </header>

        {empty ? (
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-xl text-center">
            <p className="font-title-lg text-title-lg text-on-surface">No results yet</p>
            <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
              Outcomes appear here as tasks and objectives are measured. Nothing is auto-created.
            </p>
          </div>
        ) : (
          <>
            {/* Highlight tiles (derived) */}
            <section className="mb-xl grid grid-cols-1 gap-lg sm:grid-cols-3">
              <Highlight label="Measured outcomes" value={highlights.totalOutcomes} />
              <Highlight label="Improved" value={highlights.improved} tone="text-healthy" />
              <Highlight label="Objectives measured" value={highlights.objectivesMeasured} />
            </section>

            {/* Outcome cards */}
            <Section
              title="Measured Outcomes"
              note={truncated ? `Showing ${shownCards} of ${totalCards}` : undefined}
            >
              {cards.length === 0 ? (
                <Empty>No task outcomes recorded yet.</Empty>
              ) : (
                <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
                  {cards.map((c) => {
                    const up = c.delta > 0;
                    const flat = c.delta === 0;
                    const tone = flat ? 'text-outline' : up ? 'text-healthy' : 'text-action';
                    return (
                      <article
                        key={c.id}
                        className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg"
                      >
                        <div className="flex items-start justify-between gap-sm">
                          <div className="min-w-0">
                            <h3 className="font-title-lg text-title-lg font-bold text-on-surface">
                              {c.metricName}
                            </h3>
                            <p className="line-clamp-1 font-label-sm text-label-sm text-outline">
                              {c.taskTitle}
                            </p>
                          </div>
                          {c.business ? (
                            <span className="shrink-0 rounded-sm border border-outline-variant bg-surface-container px-sm py-[1px] font-label-sm text-label-sm text-on-surface-variant">
                              {c.business}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-md flex items-baseline gap-sm">
                          <span className={`font-display text-headline-md ${tone}`}>
                            {c.delta > 0 ? '+' : ''}{c.delta}
                            {c.metricUnit ? ` ${c.metricUnit}` : ''}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            {c.baselineValue} → {c.observedValue} · {c.direction}
                          </span>
                        </div>
                        <div className="mt-sm flex flex-wrap items-center justify-between gap-sm font-label-sm text-label-sm text-outline">
                          <span>{c.owner}</span>
                          <span>{formatDate(c.observedAt)}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Objectives → measured outcomes */}
            <Section title="Objectives → Measured Outcomes" count={objectives.length}>
              {objectives.length === 0 ? (
                <Empty>No objectives defined yet.</Empty>
              ) : (
                <div className="space-y-lg">
                  {objectives.map((obj) => (
                    <article
                      key={obj.id}
                      className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg"
                    >
                      <header className="flex flex-wrap items-start justify-between gap-sm">
                        <div className="min-w-0">
                          <h3 className="font-title-lg text-title-lg font-bold text-on-surface">{obj.title}</h3>
                          {obj.targetOutcomeSummary ? (
                            <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
                              {obj.targetOutcomeSummary}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 rounded-sm border border-outline-variant bg-surface-container px-sm py-[1px] font-label-sm text-label-sm uppercase text-on-surface-variant">
                          {obj.status}
                        </span>
                      </header>

                      {obj.outcomes.length === 0 ? (
                        <p className="mt-md font-label-sm text-label-sm italic text-outline">
                          No measured outcomes yet.
                        </p>
                      ) : (
                        <ul className="mt-md space-y-sm">
                          {obj.outcomes.map((o) => (
                            <li
                              key={o.id}
                              className="flex flex-wrap items-center justify-between gap-sm border-t border-outline-variant pt-sm first:border-t-0 first:pt-0"
                            >
                              <span className="min-w-0 flex-1 truncate font-body-md text-body-md text-on-surface">
                                {o.name}
                              </span>
                              <span className="font-label-md text-label-md text-on-surface-variant">
                                {o.baselineValue ?? '—'} → {o.currentValue ?? '—'}
                                {o.targetValue != null ? ` / target ${o.targetValue}` : ''}
                                {o.metricUnit ? ` ${o.metricUnit}` : ''}
                              </span>
                              <StatusBadge
                                state={
                                  o.status === 'achieved'
                                    ? 'healthy'
                                    : o.status === 'failed'
                                      ? 'action'
                                      : o.status === 'in_progress'
                                        ? 'attention'
                                        : 'neutral'
                                }
                                label={o.status}
                                size="sm"
                              />
                              <span className="font-label-sm text-label-sm text-outline">
                                {formatDate(o.lastMeasuredAt)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}

        <p className="mt-xl border-t border-outline-variant pt-lg text-center font-label-sm text-label-sm uppercase tracking-widest text-outline">
          <DataTag kind="HAVE" /> <span className="ms-sm align-middle">task_outcomes · objective_outcomes</span>
        </p>
      </div>
    </div>
  );
}

function Highlight({ label, value, tone = 'text-on-surface' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
      <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">{label}</p>
      <p className={`mt-xs font-display text-display ${tone}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  count,
  note,
  children,
}: {
  title: string;
  count?: number;
  note?: string | undefined;
  children: ReactNode;
}) {
  return (
    <section className="mb-xl">
      <div className="mb-md flex items-baseline justify-between gap-sm">
        <h2 className="flex items-baseline gap-sm font-headline-md text-headline-md text-on-surface">
          {title}
          {typeof count === 'number' ? (
            <span className="font-label-sm text-label-sm text-outline">{count}</span>
          ) : null}
        </h2>
        {note ? <span className="font-label-sm text-label-sm text-outline">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="font-body-md text-body-md italic text-on-surface-variant">{children}</p>;
}
