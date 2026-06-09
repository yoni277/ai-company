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
import { DataTag, StatusBadge, type HealthState } from '../../components/ds';
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
 * Recursive renderer for the report body jsonb. Bodies vary per executive, but
 * the common ChiefOfStaffOutput shape (headline, topRisks/topOpportunities,
 * perProject, ceoPriorities, keyMetrics…) renders as readable cards/lists — not
 * raw JSON. Known shapes get first-class treatment; the JSON <pre> stays only as
 * a genuine last-resort for shapes we can't make sense of. Never throws.
 */
function BriefingBody({ body }: { body: unknown }): ReactNode {
  if (body == null) {
    return <p className="font-body-md text-body-md italic text-on-surface-variant">No additional detail.</p>;
  }
  if (isScalar(body)) {
    return <p className="whitespace-pre-wrap font-body-md text-body-md text-on-surface">{String(body)}</p>;
  }
  if (Array.isArray(body)) return <BodyArray value={body} />;
  return <BodyObject value={body as Record<string, unknown>} />;
}

function isScalar(v: unknown): v is string | number | boolean {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

const KEY_LABEL: Record<string, string> = {
  topRisks: 'Top risks',
  topOpportunities: 'Top opportunities',
  perProject: 'Per business',
  ceoPriorities: 'CEO priorities',
  keyMetrics: 'Key metrics',
  companyHealth: 'Company health',
  recommendedAction: 'Recommended action',
  generatedAt: 'Generated',
  projectSlug: 'Business',
  proposedTasks: 'Proposed tasks',
};
function humanize(key: string): string {
  if (KEY_LABEL[key]) return KEY_LABEL[key];
  const s = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function severityState(s: string): HealthState {
  const v = s.toLowerCase();
  if (v === 'critical' || v === 'high') return 'action';
  if (v === 'medium') return 'attention';
  return 'neutral';
}

const MAX_DEPTH = 4;

/** Render one value of any type. Beyond MAX_DEPTH, complex shapes fall back to
 * a JSON <pre> — the genuine last resort for anything we can't structure. */
function BodyValue({ value, depth = 0 }: { value: unknown; depth?: number }): ReactNode {
  if (value == null) return <p className="font-body-md text-body-md italic text-on-surface-variant">—</p>;
  if (isScalar(value)) return <p className="whitespace-pre-wrap font-body-md text-body-md text-on-surface">{String(value)}</p>;
  if (depth >= MAX_DEPTH) {
    return (
      <pre className="overflow-x-auto rounded border border-outline-variant bg-surface-container-low p-sm font-mono text-label-sm text-on-surface-variant">
        {safeJson(value)}
      </pre>
    );
  }
  if (Array.isArray(value)) return <BodyArray value={value} depth={depth} />;
  return <BodyObject value={value as Record<string, unknown>} depth={depth} />;
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function BodyObject({ value, depth = 0 }: { value: Record<string, unknown>; depth?: number }): ReactNode {
  const entries = Object.entries(value);
  const scalars = entries.filter(([, v]) => isScalar(v));
  const complex = entries.filter(([, v]) => v != null && typeof v === 'object');
  if (scalars.length === 0 && complex.length === 0) {
    return <p className="font-body-md text-body-md italic text-on-surface-variant">Empty.</p>;
  }
  return (
    <div className="space-y-md">
      {scalars.length > 0 ? (
        <dl className="space-y-xs">
          {scalars.map(([k, v]) => (
            <div key={k} className="flex flex-wrap gap-sm">
              <dt className="font-label-sm text-label-sm uppercase text-outline">{humanize(k)}</dt>
              <dd className="font-body-md text-body-md text-on-surface">{String(v)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {complex.map(([k, v]) => (
        <section key={k}>
          <p className="mb-xs font-label-sm text-label-sm uppercase tracking-wider text-outline">{humanize(k)}</p>
          <BodyValue value={v} depth={depth + 1} />
        </section>
      ))}
    </div>
  );
}

function BodyArray({ value, depth = 0 }: { value: unknown[]; depth?: number }): ReactNode {
  if (value.length === 0) return <p className="font-body-md text-body-md italic text-on-surface-variant">None.</p>;
  if (value.every(isScalar)) {
    return (
      <ul className="space-y-xs">
        {value.map((v, i) => (
          <li key={i} className="flex items-start gap-sm font-body-md text-body-md text-on-surface">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            {String(v)}
          </li>
        ))}
      </ul>
    );
  }
  return <div className="space-y-sm">{value.map((item, i) => <BodyArrayItem key={i} item={item} depth={depth} />)}</div>;
}

function BodyArrayItem({ item, depth = 0 }: { item: unknown; depth?: number }): ReactNode {
  if (isScalar(item)) {
    return <p className="font-body-md text-body-md text-on-surface">{String(item)}</p>;
  }
  if (item == null || typeof item !== 'object' || Array.isArray(item)) {
    return <BodyValue value={item} depth={depth + 1} />;
  }
  const o = item as Record<string, unknown>;
  const has = (k: string) => typeof o[k] === 'string' && (o[k] as string).length > 0;

  // Risk-like / opportunity-like → severity/priority-badged card.
  const isRisk = has('description') && has('severity');
  const isOpp = has('description') && has('priority');
  if (isRisk || isOpp) {
    const level = String(o.severity ?? o.priority ?? '');
    return (
      <article className={`rounded-lg border border-outline-variant bg-surface-container-lowest p-md border-s-4 ${isRisk ? 'border-s-action' : 'border-s-attention'}`}>
        <div className="mb-xs flex flex-wrap items-center gap-sm">
          <StatusBadge state={isRisk ? severityState(level) : 'attention'} label={`${level}${isOpp ? ' priority' : ''}`} size="sm" />
          {typeof o.projectSlug === 'string' ? <span className="font-label-sm text-label-sm uppercase text-outline">{o.projectSlug}</span> : null}
        </div>
        <p className="font-body-md text-body-md text-on-surface">{String(o.description)}</p>
        {has('recommendedAction') ? (
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant">→ {String(o.recommendedAction)}</p>
        ) : null}
      </article>
    );
  }

  // Generic object item → a small card with its fields (recursed).
  return (
    <article className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <BodyObject value={o} depth={depth + 1} />
    </article>
  );
}
