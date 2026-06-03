import Link from 'next/link';
import { ensureSeededMockData, getPlatform } from '../lib/platform';
import { loadPhase2Snapshot } from '../lib/phase2-metrics';
import { loadFoodTruckBusinessMetrics } from '../lib/owner-acquisition';
import { loadPortfolioIntelligenceForDashboard } from '../lib/portfolio-intelligence';
import { listActiveDirectives, listDecisions } from '../lib/ceo-operating-system';
import { OwnerAcquisitionPanel } from '../components/OwnerAcquisitionPanel';
import { PortfolioOverviewPanel } from '../components/PortfolioOverviewPanel';
import { RevenueOverviewPanel } from '../components/RevenueOverviewPanel';
import { FinancialIntelligencePanel } from '../components/FinancialIntelligencePanel';
import { FunnelIntelligencePanel } from '../components/FunnelIntelligencePanel';
import { CeoActionQueuePanel } from '../components/CeoActionQueuePanel';
import { deterministicDailyBrief } from '@ai-company/ai-chief-of-staff';
import { Badge, Card, EmptyState, Stat } from '../components/Card';
import { SyncButton } from '../components/SyncButton';
import { BriefingButton } from '../components/BriefingButton';
import { ProductionMetricsClient } from '../components/ProductionMetricsClient';
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  PRIORITY_COLOR,
  SEVERITY_COLOR,
  relativeTime,
} from '../lib/format';
import { CHIEF_OF_STAFF_ID } from '@ai-company/ai-chief-of-staff';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  await ensureSeededMockData();
  const { repos } = getPlatform();

  const [projects, openRisks, opportunities, latestBriefing, phase2, foodTruck, portfolioLoad, ceoDirectives, ceoDecisions] =
    await Promise.all([
      repos.projects.list(),
      repos.risks.listOpen(),
      repos.opportunities.listAll(),
      repos.reports.latest(CHIEF_OF_STAFF_ID, 'daily_briefing'),
      loadPhase2Snapshot(repos),
      loadFoodTruckBusinessMetrics(),
      loadPortfolioIntelligenceForDashboard(),
      listActiveDirectives(),
      listDecisions(),
    ]);

  const { portfolio, funnels, decisionSupport, bundles } = portfolioLoad;
  const topBundle = bundles.find((b) => b.projectId === portfolio.priorities[0]?.projectId);

  const dailyBrief = deterministicDailyBrief({
    github: phase2.github,
    supabase: phase2.supabase,
    health: phase2.health,
    pendingApprovalCount: phase2.pendingApprovals.length,
    // Chief of Staff reads only `acquisitionSummary`; `foodTruck` is kept
    // for the rest of the instance dashboard panels until the deprecated
    // field is fully migrated out (see GENERIC_PLATFORM_REFACTOR_PLAN.md L1).
    acquisitionSummary: foodTruck.acquisitionSummary,
    foodTruck: foodTruck.metrics,
    funnels,
    decisionSupport,
    portfolio,
    revenueSnapshots: portfolioLoad.revenueSnapshots,
    ceoDirectives,
    ceoDecisions,
    ...(portfolio.financial ? { portfolioFinancial: portfolio.financial } : {}),
    ...(topBundle?.briefDetail !== undefined
      ? { portfolioTopProjectBriefDetail: topBundle.briefDetail }
      : {}),
  });

  const live = projects.filter((p) => p.status !== 'archived' && p.status !== 'paused');
  const critical = projects.filter((p) => p.status === 'critical').length;
  const atRisk = projects.filter((p) => p.status === 'at_risk').length;
  const healthy = projects.filter((p) => p.status === 'healthy').length;
  const companyHealth =
    critical > 0 ? 'critical' : atRisk > 0 ? 'at_risk' : 'healthy';

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cross-company snapshot · {live.length} live project{live.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <SyncButton />
          <BriefingButton reportType="daily_briefing" label="Generate daily briefing" />
        </div>
      </header>

      <ProductionMetricsClient snapshot={phase2} initialBrief={dailyBrief} />

      <PortfolioOverviewPanel portfolio={portfolio} />

      <RevenueOverviewPanel revenue={portfolio.revenue} />

      <FinancialIntelligencePanel financial={portfolio.financial} />

      <OwnerAcquisitionPanel metrics={foodTruck.metrics} />

      <FunnelIntelligencePanel snapshots={funnels} />

      <CeoActionQueuePanel results={decisionSupport} />

      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Stat
            label="Company health"
            value={
              <Badge className={HEALTH_COLOR[companyHealth]}>{HEALTH_LABEL[companyHealth]}</Badge>
            }
            hint={`${healthy} healthy · ${atRisk} at risk · ${critical} critical`}
          />
          <Stat label="Active projects" value={live.length} />
          <Stat label="Open risks" value={openRisks.length} />
          <Stat label="Open opportunities" value={opportunities.length} />
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card
          title="Projects"
          subtitle="Status across all monitored businesses"
          action={
            <Link href="/projects" className="text-xs text-slate-400 hover:text-slate-200">
              View all →
            </Link>
          }
        >
          {projects.length === 0 ? (
            <EmptyState>No projects yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-800">
              {projects.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/projects/${p.slug}` as never}
                      className="text-sm text-slate-100 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-slate-500">{p.description}</div>
                  </div>
                  <Badge className={HEALTH_COLOR[p.status]}>{HEALTH_LABEL[p.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Open risks" subtitle="Highest severity first">
          {openRisks.length === 0 ? (
            <EmptyState>No open risks.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {[...openRisks]
                .sort((a, b) => sev(a.severity) - sev(b.severity))
                .slice(0, 6)
                .map((r) => {
                  const project = projects.find((p) => p.id === r.projectId);
                  return (
                    <li key={r.id} className="flex items-start gap-3">
                      <Badge className={SEVERITY_COLOR[r.severity]}>{r.severity}</Badge>
                      <div>
                        <div className="text-sm text-slate-100">{r.description}</div>
                        <div className="text-xs text-slate-500">
                          {project?.name ?? r.projectId} · {r.source} · {relativeTime(r.createdAt)}
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </Card>

        <Card title="Opportunities" subtitle="Highest priority first">
          {opportunities.length === 0 ? (
            <EmptyState>No opportunities recorded.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {[...opportunities]
                .sort((a, b) => pri(a.priority) - pri(b.priority))
                .slice(0, 6)
                .map((o) => {
                  const project = projects.find((p) => p.id === o.projectId);
                  return (
                    <li key={o.id} className="flex items-start gap-3">
                      <Badge className={PRIORITY_COLOR[o.priority]}>{o.priority}</Badge>
                      <div>
                        <div className="text-sm text-slate-100">{o.description}</div>
                        <div className="text-xs text-slate-500">
                          {project?.name ?? o.projectId} · {o.source} · {relativeTime(o.createdAt)}
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="Latest AI Chief of Staff briefing"
        action={
          <Link href="/chief-of-staff" className="text-xs text-slate-400 hover:text-slate-200">
            Open Chief of Staff →
          </Link>
        }
      >
        {latestBriefing ? (
          <div className="space-y-2">
            <div className="text-sm text-slate-100">{latestBriefing.summary}</div>
            <div className="text-xs text-slate-500">
              {latestBriefing.reportType.replace('_', ' ')} · {relativeTime(latestBriefing.createdAt)}
            </div>
          </div>
        ) : (
          <EmptyState>
            No briefing yet. Click <strong>Generate daily briefing</strong> above to create one.
          </EmptyState>
        )}
      </Card>
    </div>
  );
}

function sev(s: 'low' | 'medium' | 'high' | 'critical') {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}
function pri(p: 'low' | 'medium' | 'high') {
  return { high: 0, medium: 1, low: 2 }[p];
}
