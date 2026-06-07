import Link from 'next/link';
import { getPlatform } from '../../lib/platform';
import { Badge, Card, EmptyState } from '../../components/Card';
import { CfoBriefingButton } from '../../components/CfoBriefingButton';
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  SEVERITY_COLOR,
  formatMetric,
  relativeTime,
} from '../../lib/format';
import { CFO_ID } from '@ai-company/ai-cfo';
import type {
  CapitalAction,
  CfoOutput,
  FinancialRiskCategory,
  RevenueSignalKind,
} from '@ai-company/shared-types';

export const dynamic = 'force-dynamic';

const KIND_COLOR: Record<RevenueSignalKind, string> = {
  revenue: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  mrr: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  arr: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  cost: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  unit_economic: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  pipeline: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
};

const CATEGORY_COLOR: Record<FinancialRiskCategory, string> = {
  revenue: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  cost: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  cash: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  unit_economics: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  capital: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const ACTION_COLOR: Record<CapitalAction, string> = {
  invest: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  maintain: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  reduce: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  monetize: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  monitor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export default async function CfoPage() {
  const { repos } = getPlatform();
  const [latest, recent] = await Promise.all([
    repos.reports.latest(CFO_ID, 'daily_briefing'),
    repos.reports.list({ executiveId: CFO_ID, limit: 10 }),
  ]);

  const body = latest ? (latest.body as CfoOutput) : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">AI CFO</h1>
          <p className="text-sm text-slate-500 mt-1">
            Advisory only · interprets platform state through a finance lens · never moves money
          </p>
        </div>
        <div className="flex gap-2">
          <CfoBriefingButton reportType="daily_briefing" label="New finance briefing" />
          <CfoBriefingButton reportType="weekly_report" label="New weekly review" />
        </div>
      </header>

      {body ? (
        <>
          <Card
            title="Financial priorities"
            subtitle={`From ${latest!.reportType.replace('_', ' ')} · ${relativeTime(latest!.createdAt)}`}
          >
            <p className="text-sm text-slate-100 mb-4">{latest!.summary}</p>
            <ol className="space-y-3">
              {body.financialPriorities.map((p) => (
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
            <Card title="Financial health">
              <Badge className={HEALTH_COLOR[body.financialHealth]}>
                {HEALTH_LABEL[body.financialHealth]}
              </Badge>
            </Card>
            {body.cashSnapshot && (
              <Card title="Cash snapshot">
                {typeof body.cashSnapshot.estimatedRunwayMonths === 'number' && (
                  <div className="text-sm text-slate-100">
                    Estimated runway: <span className="font-medium">
                      {body.cashSnapshot.estimatedRunwayMonths.toLocaleString(undefined, {
                        maximumFractionDigits: 1,
                      })} months
                    </span>
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-1">
                  {body.cashSnapshot.commentary}
                </div>
              </Card>
            )}
          </div>

          <Card title="Per-project financials">
            <div className="grid md:grid-cols-2 gap-4">
              {body.perProjectFinancials.map((p) => (
                <div key={p.projectSlug} className="border border-slate-800 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-100">{p.projectSlug}</div>
                    <Badge className={HEALTH_COLOR[p.health]}>{HEALTH_LABEL[p.health]}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">{p.summary}</div>
                  {p.revenueSignals.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {p.revenueSignals.map((m, i) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <Badge className={KIND_COLOR[m.kind]}>{m.kind}</Badge>
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
            <Card title="Capital allocation">
              {body.capitalAllocations.length === 0 ? (
                <EmptyState>None in this report.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {body.capitalAllocations.map((a, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Badge className={ACTION_COLOR[a.action]}>{a.action}</Badge>
                      <div>
                        <div className="text-sm text-slate-100">{a.projectSlug}</div>
                        <div className="text-xs text-slate-400 mt-1">{a.rationale}</div>
                        <div className="text-xs text-emerald-300/80 mt-1">→ {a.estimatedImpact}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Financial risks">
              {body.financialRisks.length === 0 ? (
                <EmptyState>None recorded in this report.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {body.financialRisks.map((r, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex flex-col gap-1">
                        <Badge className={SEVERITY_COLOR[r.severity]}>{r.severity}</Badge>
                        <Badge className={CATEGORY_COLOR[r.category]}>{r.category}</Badge>
                      </div>
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
            No finance briefing yet. Use <strong>New finance briefing</strong> above to generate one.
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
