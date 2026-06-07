import Link from 'next/link';
import { getPlatform } from '../../lib/platform';
import { Badge, Card, EmptyState } from '../../components/Card';
import { CooBriefingButton } from '../../components/CooBriefingButton';
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  SEVERITY_COLOR,
  formatMetric,
  relativeTime,
} from '../../lib/format';
import { COO_ID } from '@ai-company/ai-coo';
import type {
  CooOutput,
  OperationalMetricKind,
  VendorStatus,
} from '@ai-company/shared-types';

export const dynamic = 'force-dynamic';

const KIND_COLOR: Record<OperationalMetricKind, string> = {
  throughput: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  sla: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  queue: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  utilization: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  vendor: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const VENDOR_COLOR: Record<VendorStatus, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  at_risk: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  critical: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export default async function CooPage() {
  const { repos } = getPlatform();
  const [latest, recent] = await Promise.all([
    repos.reports.latest(COO_ID, 'daily_briefing'),
    repos.reports.list({ executiveId: COO_ID, limit: 10 }),
  ]);

  const body = latest ? (latest.body as CooOutput) : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">AI COO</h1>
          <p className="text-sm text-slate-500 mt-1">
            Advisory only · interprets platform state as throughput, SLA, queues, and vendor health
          </p>
        </div>
        <div className="flex gap-2">
          <CooBriefingButton reportType="daily_briefing" label="New ops briefing" />
          <CooBriefingButton reportType="weekly_report" label="New weekly review" />
        </div>
      </header>

      {body ? (
        <>
          <Card
            title="Operational priorities"
            subtitle={`From ${latest!.reportType.replace('_', ' ')} · ${relativeTime(latest!.createdAt)}`}
          >
            <p className="text-sm text-slate-100 mb-4">{latest!.summary}</p>
            <ol className="space-y-3">
              {body.operationalPriorities.map((p) => (
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

          <Card title="Operations health">
            <Badge className={HEALTH_COLOR[body.operationsHealth]}>
              {HEALTH_LABEL[body.operationsHealth]}
            </Badge>
          </Card>

          <Card title="Per-project operations">
            <div className="grid md:grid-cols-2 gap-4">
              {body.perProjectOperations.map((p) => (
                <div key={p.projectSlug} className="border border-slate-800 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-100">{p.projectSlug}</div>
                    <Badge className={HEALTH_COLOR[p.health]}>{HEALTH_LABEL[p.health]}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">{p.summary}</div>
                  {p.operationalMetrics.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {p.operationalMetrics.map((m, i) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <Badge className={KIND_COLOR[m.kind]}>{m.kind}</Badge>
                          <div>
                            <div className="text-slate-100">
                              {m.name}: {formatMetric(m.value, m.unit)}
                              {typeof m.slaTarget === 'number' && (
                                <span className="text-slate-500">
                                  {' '}
                                  · target {formatMetric(m.slaTarget, m.unit)}
                                </span>
                              )}
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
            <Card title="Bottlenecks">
              {body.bottlenecks.length === 0 ? (
                <EmptyState>None in this report.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {body.bottlenecks.map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Badge className={SEVERITY_COLOR[b.severity]}>{b.severity}</Badge>
                      <div>
                        <div className="text-sm text-slate-100">{b.title}</div>
                        <div className="text-xs text-slate-500">{b.projectSlug}</div>
                        <div className="text-xs text-slate-400 mt-1">{b.description}</div>
                        <div className="text-xs text-emerald-300/80 mt-1">→ {b.recommendedAction}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Vendor health">
              {body.vendorHealth.length === 0 ? (
                <EmptyState>None tracked.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {body.vendorHealth.map((v, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Badge className={VENDOR_COLOR[v.status]}>{v.status}</Badge>
                      <div>
                        <div className="text-sm text-slate-100">{v.vendor}</div>
                        <div className="text-xs text-slate-500">{v.projectSlug}</div>
                        <div className="text-xs text-slate-400 mt-1">{v.notes}</div>
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
            No ops briefing yet. Use <strong>New ops briefing</strong> above to generate one.
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
