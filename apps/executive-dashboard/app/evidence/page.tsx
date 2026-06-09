/**
 * D061 / D065 · P056-v2 step 5 — Evidence (/evidence).
 *
 * The evidence_tokens ledger as a scannable table (v2-DATA-MAPPING.md): kind
 * badge, tier, description, linked task, producer, timestamp, link. Aggregated
 * server-side via loadEvidence (repo exposes per-task reads only — no fake
 * global query) with an honest "showing X of Y" disclosure.
 *
 * Server component, force-dynamic. Empty-state-valid; a11y semantic table
 * (scope headers), RTL mirrors via logical CSS.
 */

import { StatusBadge } from '../../components/ds';
import { loadEvidence } from '../../lib/executive-os';

export const dynamic = 'force-dynamic';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export default async function EvidencePage() {
  const { rows, total, shown, truncated } = await loadEvidence();

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-6xl">
        <header className="mb-xl flex flex-wrap items-end justify-between gap-md">
          <div>
            <h1 className="font-display text-display text-on-surface">Evidence</h1>
            <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">
              Every evidence token behind the work — what was produced, by whom, and whether it&apos;s verified.
            </p>
          </div>
          {total > 0 ? (
            <span className="font-label-sm text-label-sm text-outline">
              {truncated
                ? `Showing ${shown} of ${total}`
                : `${total} ${total === 1 ? 'token' : 'tokens'}`}
            </span>
          ) : null}
        </header>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-xl text-center">
            <p className="font-title-lg text-title-lg text-on-surface">No evidence yet</p>
            <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
              Evidence tokens appear here as tasks produce them. Nothing is auto-created.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
            <table className="w-full border-collapse text-start">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-start">
                  <Th>Kind</Th>
                  <Th>Tier</Th>
                  <Th>Description</Th>
                  <Th>Task</Th>
                  <Th>Producer</Th>
                  <Th>Verified</Th>
                  <Th>When</Th>
                  <Th>Link</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-outline-variant last:border-b-0">
                    <Td>
                      <span className="inline-flex rounded-sm border border-primary/30 bg-primary-container/10 px-sm py-[1px] font-label-sm text-label-sm text-primary">
                        {e.evidenceKind}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-label-sm uppercase text-on-surface-variant">{e.tier}</span>
                    </Td>
                    <Td>
                      <span className="text-on-surface">{e.description}</span>
                    </Td>
                    <Td>
                      <span className="block max-w-[16rem] truncate text-on-surface-variant" title={e.taskTitle}>
                        {e.taskTitle}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-label-sm text-on-surface-variant">{e.producer}</span>
                    </Td>
                    <Td>
                      <StatusBadge
                        state={e.verified ? 'healthy' : 'neutral'}
                        label={e.verified ? 'Verified' : 'Unverified'}
                        size="sm"
                      />
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap font-label-sm text-label-sm text-outline">
                        {formatWhen(e.createdAt)}
                      </span>
                    </Td>
                    <Td>
                      {e.link ? (
                        <a
                          href={e.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-label-md text-label-md text-primary hover:underline"
                        >
                          Open
                        </a>
                      ) : (
                        <span className="text-outline">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-md py-sm text-start font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant"
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-md py-sm align-middle font-body-md text-body-md">{children}</td>;
}
