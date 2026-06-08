/**
 * D061 / D065 · P056-v2 step 7 — Platform Backlog (/build/backlog).
 *
 * The platform's L-series workstreams (Refactor-Leaks tracker). Per
 * v2-DATA-MAPPING.md the L-rows are static/imported (DERIVED) and the live
 * health index is a NEW-SVC — the page stubs the index honestly (DATA: NEW
 * SERVICE) rather than computing a fake live status. Category counters are
 * derived from the shown rows so the numbers always match what's on screen.
 *
 * Build-zone screen — the sidebar defaults to Build mode on /build/*.
 */

import { DataTag } from '../../../components/ds';
import {
  PLATFORM_BACKLOG,
  type BacklogCategory,
  type BacklogRow,
} from '../../../lib/build-zone-data';

const CATEGORY_TONE: Record<BacklogCategory, string> = {
  Architecture: 'bg-secondary-container text-on-secondary-container border-outline-variant',
  Cloneability: 'bg-primary-container/10 text-primary border-primary/30',
  Governance: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
  'Tech Debt': 'bg-error-container text-on-error-container border-error/30',
};

const CATEGORIES: BacklogCategory[] = ['Architecture', 'Cloneability', 'Governance', 'Tech Debt'];

function statusChip(status: BacklogRow['status']): string {
  return status === 'Active'
    ? 'bg-primary-container/10 text-primary border-primary/30'
    : 'bg-surface-container text-on-surface-variant border-outline-variant';
}

export default function PlatformBacklogPage() {
  const rows = PLATFORM_BACKLOG;
  const countByCategory = (c: BacklogCategory) => rows.filter((r) => r.category === c).length;

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-5xl">
        <header className="mb-xl flex flex-wrap items-end justify-between gap-md">
          <div>
            <h1 className="font-display text-display text-on-surface">Platform Backlog</h1>
            <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">
              The platform&apos;s L-series workstreams — imported from the Refactor-Leaks tracker.
            </p>
          </div>
          {/* Live health index — NEW-SVC, stubbed honestly */}
          <div className="rounded-lg border border-outline-variant bg-surface-container-high px-md py-sm">
            <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Health Index</p>
            <DataTag kind="NEW SERVICE" className="mt-xs" />
          </div>
        </header>

        {/* Category counters (derived from shown rows) */}
        <section className="mb-xl grid grid-cols-2 gap-lg sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <div key={c} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
              <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">{c}</p>
              <p className="mt-xs font-display text-display text-on-surface">{countByCategory(c)}</p>
            </div>
          ))}
        </section>

        {/* Backlog table */}
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full border-collapse text-start">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <Th>ID</Th>
                <Th>Workstream</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant last:border-b-0">
                  <Td>
                    <span className="font-mono text-label-sm text-primary">{r.id}</span>
                  </Td>
                  <Td>
                    <span className="font-medium text-on-surface">{r.title}</span>
                  </Td>
                  <Td>
                    <span className={`inline-flex rounded-sm border px-sm py-[1px] font-label-sm text-label-sm ${CATEGORY_TONE[r.category]}`}>
                      {r.category}
                    </span>
                  </Td>
                  <Td>
                    <span className={`inline-flex rounded-full border px-sm py-[1px] font-label-sm text-label-sm ${statusChip(r.status)}`}>
                      {r.status}
                    </span>
                  </Td>
                  <Td>
                    <span className="block max-w-[22rem] font-body-md text-body-md text-on-surface-variant">
                      {r.note}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-xl border-t border-outline-variant pt-lg text-center font-label-sm text-label-sm uppercase tracking-widest text-outline">
          <DataTag kind="DERIVED" /> <span className="ms-sm align-middle">Imported from the Refactor-Leaks tracker · live health index = NEW-SVC (not wired)</span>
        </p>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-md py-sm text-start font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-md py-sm align-top font-body-md text-body-md">{children}</td>;
}
