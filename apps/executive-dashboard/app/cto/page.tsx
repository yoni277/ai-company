import Link from 'next/link';
import { getPlatform } from '../../lib/platform';
import { Badge, Card, EmptyState } from '../../components/Card';
import { CtoBriefingButton } from '../../components/CtoBriefingButton';
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  SEVERITY_COLOR,
  relativeTime,
} from '../../lib/format';
import { CTO_ID } from '@ai-company/ai-cto';
import type { CtoOutput } from '@ai-company/shared-types';

export const dynamic = 'force-dynamic';

const CATEGORY_COLOR: Record<CtoOutput['topTechnicalRisks'][number]['category'], string> = {
  infrastructure: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  security: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  reliability: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  performance: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  tech_debt: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const IMPACT_COLOR: Record<CtoOutput['techDebtItems'][number]['impact'], string> = {
  low: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  medium: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  high: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

export default async function CtoPage() {
  const { repos } = getPlatform();
  const [latest, recent] = await Promise.all([
    repos.reports.latest(CTO_ID, 'daily_briefing'),
    repos.reports.list({ executiveId: CTO_ID, limit: 10 }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">AI CTO</h1>
          <p className="text-sm text-slate-500 mt-1">
            Advisory only · interprets platform state through an engineering lens
          </p>
        </div>
        <div className="flex gap-2">
          <CtoBriefingButton reportType="daily_briefing" label="New engineering briefing" />
          <CtoBriefingButton reportType="weekly_report" label="New weekly engineering review" />
        </div>
      </header>

      {latest ? (
        <>
          <Card
            title="Engineering priorities"
            subtitle={`From ${latest.reportType.replace('_', ' ')} · ${relativeTime(latest.createdAt)}`}
          >
            <p className="text-sm text-slate-100 mb-4">{latest.summary}</p>
            <ol className="space-y-3">
              {(latest.body as CtoOutput).engineeringPriorities.map((p) => (
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

          <Card title="Platform health">
            <Badge className={HEALTH_COLOR[(latest.body as CtoOutput).platformHealth]}>
              {HEALTH_LABEL[(latest.body as CtoOutput).platformHealth]}
            </Badge>
          </Card>

          <Card title="Per-project engineering read">
            <div className="grid md:grid-cols-2 gap-4">
              {(latest.body as CtoOutput).perProjectEngineering.map((p) => (
                <div key={p.projectSlug} className="border border-slate-800 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-100">{p.projectSlug}</div>
                    <Badge className={HEALTH_COLOR[p.health]}>{HEALTH_LABEL[p.health]}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">{p.summary}</div>
                  {p.technicalSignals.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {p.technicalSignals.map((m) => (
                        <div key={m.name} className="text-xs">
                          <div className="text-slate-500">{m.name}</div>
                          <div className="text-slate-100">
                            {Number.isInteger(m.value)
                              ? m.value.toLocaleString()
                              : m.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            {m.unit ? ` ${m.unit}` : ''}
                          </div>
                          {m.commentary && (
                            <div className="text-slate-600 mt-0.5">{m.commentary}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Top technical risks">
              {(latest.body as CtoOutput).topTechnicalRisks.length === 0 ? (
                <EmptyState>None recorded in this report.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {(latest.body as CtoOutput).topTechnicalRisks.map((r, i) => (
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

            <Card title="Tech debt">
              {(latest.body as CtoOutput).techDebtItems.length === 0 ? (
                <EmptyState>None recorded in this report.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {(latest.body as CtoOutput).techDebtItems.map((d, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Badge className={IMPACT_COLOR[d.impact]}>{d.impact}</Badge>
                      <div>
                        <div className="text-sm text-slate-100">{d.title}</div>
                        <div className="text-xs text-slate-500">{d.projectSlug}</div>
                        <div className="text-xs text-slate-400 mt-1">{d.description}</div>
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
            No engineering briefing yet. Use <strong>New engineering briefing</strong> above to generate one.
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
