/**
 * D061 / D065 · P056-v2 step 4 — Briefings (/briefings).
 *
 * Executive briefings from executive_reports (summary + body jsonb), via
 * loadBriefings → repos.reports.list (v2-DATA-MAPPING.md). Summary-first: the
 * card shows the executive, report type, headline + summary; the full body is
 * revealed lazily on expand (ExpandableDetail, native <details> — no
 * all-data-on-load). Confidence is a NEW-FIELD and is OMITTED here (not
 * fabricated) until Wave-2E back-fills it.
 *
 * Server component, force-dynamic. Empty-state-valid: no reports → clean zero
 * state, no auto-generation.
 */

import type { ReactNode } from 'react';
import { DataTag } from '../../components/ds';
import { ExpandableDetail } from '../../components/executive-os/ExpandableDetail';
import { loadBriefings, type BriefingView } from '../../lib/executive-os';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<BriefingView['reportType'], string> = {
  daily_briefing: 'Daily Briefing',
  weekly_report: 'Weekly Report',
  ad_hoc: 'Ad-hoc',
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export default async function BriefingsPage() {
  const briefings = await loadBriefings();

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-5xl">
        <header className="mb-xl">
          <h1 className="font-display text-display text-on-surface">Executive Briefings</h1>
          <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">
            What your executives reported — summary first, full briefing on expand.
          </p>
        </header>

        {briefings.length === 0 ? (
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-xl text-center">
            <p className="font-title-lg text-title-lg text-on-surface">No briefings yet</p>
            <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
              Executive reports appear here as they are produced. Nothing is auto-generated.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
            {briefings.map((b) => (
              <article
                key={b.id}
                className="flex flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-lg"
              >
                <header className="flex items-start justify-between gap-sm">
                  <div className="flex flex-wrap items-center gap-sm">
                    <span className="font-label-sm text-label-sm uppercase text-outline">
                      {b.executiveName}
                    </span>
                    <span className="rounded-sm border border-outline-variant bg-surface-container px-sm py-[1px] font-label-sm text-label-sm text-on-surface-variant">
                      {TYPE_LABEL[b.reportType]}
                    </span>
                  </div>
                  <span className="shrink-0 font-label-sm text-label-sm text-outline">
                    {formatWhen(b.createdAt)}
                  </span>
                </header>

                {b.headline ? (
                  <h2 className="mt-sm font-title-lg text-title-lg font-bold text-on-surface">
                    {b.headline}
                  </h2>
                ) : null}

                <p className="mt-sm flex-1 font-body-md text-body-md text-on-surface-variant">
                  {b.summary}
                </p>

                <div className="mt-md flex items-center justify-between">
                  <ExpandableDetail label="Read full briefing">
                    <BriefingBody body={b.body} />
                  </ExpandableDetail>
                  <DataTag kind="HAVE" />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Defensive renderer for the report body jsonb. Bodies vary per executive, so
 * we render scalar fields as a definition list and complex fields (arrays /
 * nested objects) as pretty JSON — readable for any shape, never throwing.
 */
function BriefingBody({ body }: { body: unknown }): ReactNode {
  if (body == null) {
    return <p className="font-body-md text-body-md italic text-on-surface-variant">No additional detail.</p>;
  }
  if (typeof body === 'string') {
    return <p className="whitespace-pre-wrap font-body-md text-body-md text-on-surface">{body}</p>;
  }
  if (typeof body !== 'object') {
    return <p className="font-body-md text-body-md text-on-surface">{String(body)}</p>;
  }

  const entries = Object.entries(body as Record<string, unknown>);
  const scalars = entries.filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');
  const complex = entries.filter(([, v]) => v != null && typeof v === 'object');

  return (
    <div className="space-y-md">
      {scalars.length > 0 ? (
        <dl className="space-y-xs">
          {scalars.map(([k, v]) => (
            <div key={k} className="flex flex-wrap gap-sm">
              <dt className="font-label-sm text-label-sm uppercase text-outline">{k}</dt>
              <dd className="font-body-md text-body-md text-on-surface">{String(v)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {complex.map(([k, v]) => (
        <div key={k}>
          <p className="mb-xs font-label-sm text-label-sm uppercase text-outline">{k}</p>
          <pre className="overflow-x-auto rounded border border-outline-variant bg-surface-container-low p-sm font-mono text-label-sm text-on-surface-variant">
            {safeJson(v)}
          </pre>
        </div>
      ))}
      {scalars.length === 0 && complex.length === 0 ? (
        <p className="font-body-md text-body-md italic text-on-surface-variant">Empty briefing body.</p>
      ) : null}
    </div>
  );
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
