/**
 * L31 — Executives directory (spec §5). One card per executive for the selected
 * business; click → workspace. Scoped by ?project_slug= (defaults to the first
 * business).
 */

import Link from 'next/link';
import { listBusinessSlugs } from '../../lib/executive-os/meetings';
import { loadExecutiveDirectory } from '../../lib/executive-os/executives';
import { BusinessSelector } from '../../components/executive-os/BusinessSelector';

export const dynamic = 'force-dynamic';

export default async function ExecutivesPage({
  searchParams,
}: {
  searchParams: Promise<{ project_slug?: string }>;
}) {
  const businesses = await listBusinessSlugs();
  const { project_slug } = await searchParams;
  const slug = project_slug || businesses[0]?.slug || '';

  const cards = slug ? await loadExecutiveDirectory(slug) : [];

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-5xl">
        <header className="mb-xl flex flex-wrap items-end justify-between gap-md">
          <div>
            <h1 className="font-display text-display text-on-surface">Executives</h1>
            <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">
              Manage each executive for a business — open one to see their work and instruct them.
            </p>
          </div>
          {businesses.length > 0 ? <BusinessSelector businesses={businesses} current={slug} basePath="/executives" /> : null}
        </header>

        {businesses.length === 0 ? (
          <p className="font-body-md text-body-md italic text-on-surface-variant">No businesses registered yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <Link
                key={c.executiveId}
                href={`/executives/${c.executiveId}?project_slug=${encodeURIComponent(slug)}` as never}
                prefetch={false}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg transition hover:shadow-ambient"
              >
                <h2 className="font-title-lg text-title-lg font-bold text-on-surface">{c.executiveName}</h2>
                <p className="mt-xs line-clamp-2 font-body-md text-body-md text-on-surface-variant">
                  {c.strategy ?? <span className="italic">No strategy set.</span>}
                </p>
                <dl className="mt-md flex flex-wrap gap-x-lg gap-y-sm">
                  <Stat label="Open work" value={c.openWork} />
                  <Stat label="Pending" value={c.pendingDecisions} tone={c.pendingDecisions > 0 ? 'text-attention' : 'text-on-surface'} />
                </dl>
                {c.lastActivity ? (
                  <p className="mt-sm font-label-sm text-label-sm text-outline">Last activity {c.lastActivity.slice(0, 10)}</p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'text-on-surface' }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <dt className="font-label-sm text-label-sm uppercase text-outline">{label}</dt>
      <dd className={`font-title-lg text-title-lg ${tone}`}>{value}</dd>
    </div>
  );
}
