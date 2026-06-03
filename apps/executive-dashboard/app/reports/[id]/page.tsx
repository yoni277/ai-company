import { notFound } from 'next/navigation';
import { ensureSeededMockData, getPlatform } from '../../../lib/platform';
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

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureSeededMockData();
  const { id } = await params;
  const { repos } = getPlatform();
  const report = await repos.reports.getById(id);
  if (!report) notFound();

  const body = report.body as ChiefOfStaffOutput;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">{body.headline}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {report.reportType.replace('_', ' ')} · {relativeTime(report.createdAt)} ·{' '}
          <Badge className={HEALTH_COLOR[body.companyHealth]}>
            {HEALTH_LABEL[body.companyHealth]}
          </Badge>
        </p>
      </header>

      <Card title="CEO priorities">
        <ol className="space-y-3">
          {body.ceoPriorities.map((p) => (
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
          {body.perProject.map((p) => (
            <div key={p.projectSlug} className="border border-slate-800 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-100">{p.projectSlug}</div>
                <Badge className={HEALTH_COLOR[p.health]}>{HEALTH_LABEL[p.health]}</Badge>
              </div>
              <div className="text-xs text-slate-400 mt-2">{p.summary}</div>
              {p.keyMetrics.length > 0 && (
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
          {body.topRisks.map((r, i) => (
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
          {body.topOpportunities.map((o, i) => (
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
    </div>
  );
}
