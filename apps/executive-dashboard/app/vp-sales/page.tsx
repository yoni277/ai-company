import Link from 'next/link';
import { getPlatform } from '../../lib/platform';
import { Badge, Card, EmptyState } from '../../components/Card';
import { VpSalesBriefingButton } from '../../components/VpSalesBriefingButton';
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  SEVERITY_COLOR,
  formatMetric,
  relativeTime,
} from '../../lib/format';
import { VP_SALES_ID } from '@ai-company/ai-vp-sales';
import type {
  DealStatus,
  PipelineStage,
  VpSalesOutput,
} from '@ai-company/shared-types';

export const dynamic = 'force-dynamic';

const STAGE_COLOR: Record<PipelineStage, string> = {
  prospect: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  qualified: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  demo: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  pilot: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  negotiation: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  closed_won: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  closed_lost: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const DEAL_COLOR: Record<DealStatus, string> = {
  open: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  at_risk: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  won: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  lost: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export default async function VpSalesPage() {
  const { repos } = getPlatform();
  const [latest, recent] = await Promise.all([
    repos.reports.latest(VP_SALES_ID, 'daily_briefing'),
    repos.reports.list({ executiveId: VP_SALES_ID, limit: 10 }),
  ]);

  const body = latest ? (latest.body as VpSalesOutput) : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">AI VP Sales</h1>
          <p className="text-sm text-slate-500 mt-1">
            Advisory only · interprets platform state through the pipeline · never sends outreach
          </p>
        </div>
        <div className="flex gap-2">
          <VpSalesBriefingButton reportType="daily_briefing" label="New sales briefing" />
          <VpSalesBriefingButton reportType="weekly_report" label="New weekly review" />
        </div>
      </header>

      {body ? (
        <>
          <Card
            title="Sales priorities"
            subtitle={`From ${latest!.reportType.replace('_', ' ')} · ${relativeTime(latest!.createdAt)}`}
          >
            <p className="text-sm text-slate-100 mb-4">{latest!.summary}</p>
            <ol className="space-y-3">
              {body.salesPriorities.map((p) => (
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

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Sales health">
              <Badge className={HEALTH_COLOR[body.salesHealth]}>{HEALTH_LABEL[body.salesHealth]}</Badge>
            </Card>
            {body.forecastSummary && (
              <Card title="Forecast">
                {typeof body.forecastSummary.quotaProgress === 'number' && (
                  <div className="text-sm text-slate-100">
                    Quota progress:{' '}
                    <span className="font-medium">
                      {(body.forecastSummary.quotaProgress * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-1">
                  {body.forecastSummary.commentary}
                </div>
              </Card>
            )}
          </div>

          <Card title="Per-project pipeline">
            <div className="grid md:grid-cols-2 gap-4">
              {body.perProjectSales.map((p) => (
                <div key={p.projectSlug} className="border border-slate-800 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-100">{p.projectSlug}</div>
                    <Badge className={HEALTH_COLOR[p.health]}>{HEALTH_LABEL[p.health]}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">{p.summary}</div>
                  {p.pipelineMetrics.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {p.pipelineMetrics.map((m, i) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <Badge className={STAGE_COLOR[m.stage]}>{m.stage}</Badge>
                          <div>
                            <div className="text-slate-100">
                              {m.name}: {formatMetric(m.value, m.unit)}
                            </div>
                            {m.commentary && (
                              <div className="text-slate-500 mt-0.5">{m.commentary}</div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Deals">
              {body.deals.length === 0 ? (
                <EmptyState>None in this report.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {body.deals.map((d, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Badge className={DEAL_COLOR[d.status]}>{d.status}</Badge>
                      <div>
                        <div className="text-sm text-slate-100">{d.title}</div>
                        <div className="text-xs text-slate-500">
                          {d.projectSlug}
                          {typeof d.estimatedValue === 'number' && (
                            <>
                              {' · '}
                              ~{d.estimatedValue.toLocaleString()}
                              {d.estimatedValueUnit ? ` ${d.estimatedValueUnit}` : ''}
                            </>
                          )}
                        </div>
                        <div className="text-xs text-emerald-300/80 mt-1">→ {d.nextAction}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Sales risks">
              {body.salesRisks.length === 0 ? (
                <EmptyState>None recorded in this report.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {body.salesRisks.map((r, i) => (
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
              )}
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <EmptyState>
            No sales briefing yet. Use <strong>New sales briefing</strong> above to generate one.
          </EmptyState>
        </Card>
      )}

      <Card title="History">
        {recent.length === 0 ? (
          <EmptyState>None.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-800">
            {recent.map((r) => (
              <li key={r.id} className="py-3">
                <Link href={`/reports/${r.id}` as never} className="text-sm text-slate-100 hover:underline">
                  {r.summary}
                </Link>
                <div className="text-xs text-slate-500">
                  {r.reportType.replace('_', ' ')} · {relativeTime(r.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
