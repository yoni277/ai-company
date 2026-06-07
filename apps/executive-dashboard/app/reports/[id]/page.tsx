import { notFound } from 'next/navigation';
import { getPlatform } from '../../../lib/platform';
import { Badge, Card } from '../../../components/Card';
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  PRIORITY_COLOR,
  SEVERITY_COLOR,
  formatMetric,
  relativeTime,
} from '../../../lib/format';
import type { ChiefOfStaffOutput } from '@ai-company/shared-types';

export const dynamic = 'force-dynamic';

const EXECUTIVE_LABEL: Record<string, string> = {
  'chief-of-staff': 'Chief of Staff',
  cto: 'CTO',
  coo: 'COO',
  cfo: 'CFO',
  'vp-marketing': 'VP Marketing',
  'vp-sales': 'VP Sales',
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { repos } = getPlatform();
  const report = await repos.reports.getById(id);
  if (!report) notFound();

  const isCos = report.executiveId === 'chief-of-staff';
  const body = report.body as Record<string, unknown>;
  const headline =
    typeof body.headline === 'string' ? body.headline : (report.summary ?? id);
  const executiveLabel =
    EXECUTIVE_LABEL[report.executiveId] ?? report.executiveId;

  // Phase 2A: surface research sources as their own card if present, ABOVE
  // the structured body — per Human Governance pillar the operator must see
  // what informed the report before reading the conclusions.
  const sources = Array.isArray(body.researchSources)
    ? (body.researchSources as Array<{
        url: string;
        title: string | null;
        snippet: string;
        fetchedAt: string;
        contentTier: 'E2';
        citation: string | null;
      }>)
    : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">{headline}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {executiveLabel} · {report.reportType.replace('_', ' ')} ·{' '}
          {relativeTime(report.createdAt)}
          {isCos && typeof body.companyHealth === 'string' ? (
            <>
              {' · '}
              <Badge
                className={
                  HEALTH_COLOR[body.companyHealth as keyof typeof HEALTH_COLOR]
                }
              >
                {HEALTH_LABEL[body.companyHealth as keyof typeof HEALTH_LABEL]}
              </Badge>
            </>
          ) : null}
          {sources.length > 0 ? (
            <>
              {' · '}
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                {sources.length} source{sources.length === 1 ? '' : 's'} cited
              </Badge>
            </>
          ) : null}
        </p>
      </header>

      {sources.length > 0 ? <SourcesCard sources={sources} /> : null}

      {isCos ? <CosReportBody body={report.body as ChiefOfStaffOutput} /> : (
        <GenericReportBody body={report.body as Record<string, unknown>} />
      )}
    </div>
  );
}

function SourcesCard({
  sources,
}: {
  sources: Array<{
    url: string;
    title: string | null;
    snippet: string;
    fetchedAt: string;
    contentTier: 'E2';
    citation: string | null;
  }>;
}) {
  return (
    <Card
      title="Sources cited"
      subtitle="External research the executive used. Each source is E2 (Artifact Creation) per the Evidence Hierarchy doctrine."
    >
      <ul className="space-y-3">
        {sources.map((s, i) => {
          const isErrorMarker = s.url.startsWith('error://research/');
          return (
            <li
              key={`${s.url}-${i}`}
              className="border border-slate-800 rounded-md p-3"
            >
              {isErrorMarker ? (
                <div className="text-xs text-rose-300/90">
                  Research call failed: {s.snippet}
                </div>
              ) : (
                <>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-sky-300 hover:underline break-all"
                  >
                    {s.title || s.url}
                  </a>
                  {s.snippet ? (
                    <div className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">
                      {s.snippet}
                    </div>
                  ) : null}
                  <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide">
                    E2 · fetched {s.fetchedAt}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function CosReportBody({ body }: { body: ChiefOfStaffOutput }) {
  return (
    <>
      <Card title="CEO priorities">
        <ol className="space-y-3">
          {(body.ceoPriorities ?? []).map((p) => (
            <li key={p.rank} className="flex gap-3">
              <span className="text-slate-500 text-sm w-6">#{p.rank}</span>
              <div>
                <div className="text-sm text-slate-100 font-medium">{p.title}</div>
                <div className="text-xs text-slate-400">{p.rationale}</div>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Per-project read">
        <div className="grid md:grid-cols-2 gap-4">
          {(body.perProject ?? []).map((p) => (
            <div key={p.projectSlug} className="border border-slate-800 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-100">{p.projectSlug}</div>
                <Badge className={HEALTH_COLOR[p.health]}>{HEALTH_LABEL[p.health]}</Badge>
              </div>
              <div className="text-xs text-slate-400 mt-2">{p.summary}</div>
              {(p.keyMetrics ?? []).length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {p.keyMetrics.map((m) => (
                    <div key={m.name} className="text-xs">
                      <div className="text-slate-500">{m.name}</div>
                      <div className="text-slate-100">{formatMetric(m.value, m.unit)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Top risks">
        <ul className="space-y-3">
          {(body.topRisks ?? []).map((r, i) => (
            <li key={i} className="flex items-start gap-3">
              <Badge className={SEVERITY_COLOR[r.severity]}>{r.severity}</Badge>
              <div>
                <div className="text-sm text-slate-100">{r.description}</div>
                <div className="text-xs text-slate-500">{r.projectSlug}</div>
                <div className="text-xs text-slate-400 mt-1">→ {r.recommendedAction}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Top opportunities">
        <ul className="space-y-3">
          {(body.topOpportunities ?? []).map((o, i) => (
            <li key={i} className="flex items-start gap-3">
              <Badge className={PRIORITY_COLOR[o.priority]}>{o.priority}</Badge>
              <div>
                <div className="text-sm text-slate-100">{o.description}</div>
                <div className="text-xs text-slate-500">{o.projectSlug}</div>
                <div className="text-xs text-slate-400 mt-1">→ {o.recommendedAction}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/**
 * Generic renderer for executive reports we don't yet have a bespoke layout
 * for (CTO, COO, CFO, VP Marketing, VP Sales). Walks the body object and
 * renders each top-level key as a section: strings render as paragraphs,
 * arrays render as compact lists. Falls back to a JSON dump for nested
 * objects so nothing is hidden from the operator.
 *
 * Deliberately not building per-executive bespoke layouts here — that's
 * Phase 2 candidate work, gated by 3+ friction entries surviving the
 * Friday discriminator (per D020).
 */
function GenericReportBody({ body }: { body: Record<string, unknown> }) {
  // Hide fields already shown in the header or in the Sources card above.
  const HIDDEN = new Set([
    'headline',
    'companyHealth',
    'generatedAt',
    'researchSources',
  ]);
  const entries = Object.entries(body).filter(([k]) => !HIDDEN.has(k));
  return (
    <>
      {entries.map(([key, value]) => (
        <Card key={key} title={humanize(key)}>
          {renderValue(value)}
        </Card>
      ))}
    </>
  );
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <p className="text-sm text-slate-500 italic">none</p>;
  }
  if (typeof value === 'string') {
    return <p className="text-sm text-slate-200 whitespace-pre-wrap">{value}</p>;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <p className="text-sm text-slate-200">{String(value)}</p>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-slate-500 italic">none</p>;
    }
    return (
      <ul className="space-y-3">
        {value.map((item, i) => (
          <li key={i} className="border border-slate-800 rounded-md p-3">
            {renderInlineObject(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    return renderInlineObject(value);
  }
  return <pre className="text-xs text-slate-400 whitespace-pre-wrap">{String(value)}</pre>;
}

function renderInlineObject(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <p className="text-sm text-slate-500 italic">none</p>;
  }
  if (typeof value !== 'object') {
    return <p className="text-sm text-slate-200">{String(value)}</p>;
  }
  if (Array.isArray(value)) {
    return renderValue(value);
  }
  const obj = value as Record<string, unknown>;
  return (
    <div className="space-y-1">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="text-sm">
          <span className="text-slate-500 text-xs uppercase tracking-wide mr-2">
            {humanize(k)}:
          </span>
          {typeof v === 'string' ? (
            <span className="text-slate-200 whitespace-pre-wrap">{v}</span>
          ) : typeof v === 'number' || typeof v === 'boolean' ? (
            <span className="text-slate-200">{String(v)}</span>
          ) : v === null || v === undefined ? (
            <span className="text-slate-500 italic">none</span>
          ) : Array.isArray(v) ? (
            <div className="mt-1 ml-2">{renderValue(v)}</div>
          ) : (
            <div className="mt-1 ml-2">{renderInlineObject(v)}</div>
          )}
        </div>
      ))}
    </div>
  );
}
