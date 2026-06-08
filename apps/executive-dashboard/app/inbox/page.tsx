/**
 * D061 / P056.4 — Inbox (Wave 1B).
 *
 * The decision surface: every proposed decision + pending proposal in one queue
 * with inline Approve / Reject / Request-Clarification wired to the verified
 * mutation routes (via DecisionQueueItem), plus the open-risks section. Server
 * component reads real data (loadInboxData → repos direct); 1-click decisions
 * re-run the page via router.refresh().
 *
 * Gate: 1-click decision works end-to-end through verified endpoints · lazy
 * detail-on-expand (ExpandableDetail) · empty-state-valid.
 */

import type { ReactNode } from 'react';
import { StatusBadge, Surface } from '../../components/ds';
import { DecisionQueueItem } from '../../components/executive-os/DecisionQueueItem';
import { ExpandableDetail } from '../../components/executive-os/ExpandableDetail';
import { LocaleToggle } from '../../components/executive-os/LocaleToggle';
import { loadInboxData } from '../../lib/executive-os';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const { queue, risks } = await loadInboxData();

  return (
    <div className="ds-surface min-h-screen rounded-lg px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-4xl">
        <header className="mb-xl flex flex-wrap items-end justify-between gap-md">
          <div>
            <h1 className="font-display text-display text-on-surface">Inbox</h1>
            <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">
              Every decision waiting on you — approve, reject, or ask for more.
            </p>
          </div>
          <LocaleToggle />
        </header>

        {/* Decision queue */}
        <section className="mb-xl">
          <h2 className="mb-md flex items-baseline gap-sm font-headline-md text-headline-md text-on-surface">
            Decision Queue
            <span className="font-label-sm text-label-sm text-outline">{queue.length}</span>
          </h2>
          {queue.length === 0 ? (
            <Empty>Inbox zero — no decisions or proposals are pending.</Empty>
          ) : (
            <div className="space-y-lg">
              {queue.map((item) => (
                <DecisionQueueItem key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* Risks */}
        <section className="mb-xl">
          <h2 className="mb-md flex items-baseline gap-sm font-headline-md text-headline-md text-on-surface">
            Open Risks
            <span className="font-label-sm text-label-sm text-outline">{risks.length}</span>
          </h2>
          {risks.length === 0 ? (
            <Empty>No open risks.</Empty>
          ) : (
            <div className="space-y-lg">
              {risks.map((r) => (
                <Surface key={r.id} as="article" interactive>
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <StatusBadge
                      state={r.state}
                      label={`${r.severity.charAt(0).toUpperCase()}${r.severity.slice(1)} risk`}
                      size="sm"
                    />
                    <span className="font-label-sm text-label-sm uppercase text-outline">
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-sm font-body-md text-body-md text-on-surface">{r.description}</p>
                  <ExpandableDetail label="Show provenance">
                    <dl className="flex flex-wrap gap-x-lg gap-y-xs font-label-sm text-label-sm text-outline">
                      {r.context ? (
                        <div>
                          <dt className="uppercase">Project</dt>
                          <dd className="text-on-surface-variant">{r.context}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="uppercase">Recorded by</dt>
                        <dd className="text-on-surface-variant">{r.recordedBy}</dd>
                      </div>
                      {r.generation > 1 ? (
                        <div>
                          <dt className="uppercase">Re-detected</dt>
                          <dd className="text-on-surface-variant">×{r.generation}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </ExpandableDetail>
                </Surface>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="font-body-md text-body-md italic text-on-surface-variant">{children}</p>
  );
}
