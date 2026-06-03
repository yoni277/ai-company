import Link from 'next/link';
import { ensureSeededMockData, getPlatform } from '../../lib/platform';
import { Badge, Card, EmptyState } from '../../components/Card';
import { VpMarketingBriefingButton } from '../../components/VpMarketingBriefingButton';
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  SEVERITY_COLOR,
  formatMetric,
  relativeTime,
} from '../../lib/format';
import { VP_MARKETING_ID } from '@ai-company/ai-vp-marketing';
import type {
  FunnelStage,
  MarketingChannel,
  CampaignPriority,
  VpMarketingOutput,
} from '@ai-company/shared-types';

export const dynamic = 'force-dynamic';

const STAGE_COLOR: Record<FunnelStage, string> = {
  awareness: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  acquisition: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  activation: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  retention: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  referral: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  revenue: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
};

const CHANNEL_COLOR: Record<MarketingChannel, string> = {
  email: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  push: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  whatsapp: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  social: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  paid: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  partnership: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  organic: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  product: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
};

const PRIORITY_COLOR: Record<CampaignPriority, string> = {
  low: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  medium: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  high: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

export default async function VpMarketingPage() {
  await ensureSeededMockData();
  const { repos } = getPlatform();
  const [latest, recent] = await Promise.all([
    repos.reports.latest(VP_MARKETING_ID, 'daily_briefing'),
    repos.reports.list({ executiveId: VP_MARKETING_ID, limit: 10 }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">AI VP Marketing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Advisory only · interprets platform state through a growth lens
          </p>
        </div>
        <div className="flex gap-2">
          <VpMarketingBriefingButton reportType="daily_briefing" label="New marketing briefing" />
          <VpMarketingBriefingButton reportType="weekly_report" label="New weekly review" />
        </div>
      </header>

      {latest ? (
        <>
          <Card
            title="Marketing priorities"
            subtitle={`From ${latest.reportType.replace('_', ' ')} · ${relativeTime(latest.createdAt)}`}
          >
            <p className="text-sm text-slate-100 mb-4">{latest.summary}</p>
            <ol className="space-y-3">
              {(latest.body as VpMarketingOutput).marketingPriorities.map((p) => (
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

          <Card title="Marketing health">
            <Badge className={HEALTH_COLOR[(latest.body as VpMarketingOutput).marketingHealth]}>
              {HEALTH_LABEL[(latest.body as VpMarketingOutput).marketingHealth]}
            </Badge>
          </Card>

          <Card title="Per-project funnel">
            <div className="grid md:grid-cols-2 gap-4">
              {(latest.body as VpMarketingOutput).perProjectMarketing.map((p) => (
                <div key={p.projectSlug} className="border border-slate-800 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-100">{p.projectSlug}</div>
                    <Badge className={HEALTH_COLOR[p.health]}>{HEALTH_LABEL[p.health]}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">{p.summary}</div>
                  {p.funnelMetrics.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {p.funnelMetrics.map((m, i) => (
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
            <Card title="Campaign ideas">
              {(latest.body as VpMarketingOutput).campaignIdeas.length === 0 ? (
                <EmptyState>None in this report.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {(latest.body as VpMarketingOutput).campaignIdeas.map((c, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex flex-col gap-1">
                        <Badge className={CHANNEL_COLOR[c.channel]}>{c.channel}</Badge>
                        <Badge className={PRIORITY_COLOR[c.priority]}>{c.priority}</Badge>
                      </div>
                      <div>
                        <div className="text-sm text-slate-100">{c.title}</div>
                        <div className="text-xs text-slate-500">{c.projectSlug}</div>
                        <div className="text-xs text-slate-400 mt-1">{c.description}</div>
                        <div className="text-xs text-emerald-300/80 mt-1">→ {c.expectedImpact}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Growth risks">
              {(latest.body as VpMarketingOutput).growthRisks.length === 0 ? (
                <EmptyState>None recorded in this report.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {(latest.body as VpMarketingOutput).growthRisks.map((r, i) => (
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
            No marketing briefing yet. Use <strong>New marketing briefing</strong> above to generate one.
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
