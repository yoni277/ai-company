import type { PortfolioIntelligenceSnapshot } from '@ai-company/shared-types';
import { Badge, Card } from './Card';

const FUNNEL_HEALTH_COLOR = {
  healthy: 'bg-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-300',
  critical: 'bg-red-500/15 text-red-300',
} as const;

const PORTFOLIO_HEALTH_COLOR = FUNNEL_HEALTH_COLOR;

export function PortfolioOverviewPanel({
  portfolio,
}: {
  portfolio: PortfolioIntelligenceSnapshot;
}) {
  const { health, projects, priorities, revenue } = portfolio;
  const rankByProject = new Map(priorities.map((p) => [p.projectId, p.rank]));
  const revenueByProject = new Map(
    (revenue?.projects ?? []).map((r) => [r.projectId, r]),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Phase 4A · Portfolio overview (multi-project intelligence)</span>
        <Badge className={PORTFOLIO_HEALTH_COLOR[health.status]}>
          Portfolio {health.status}
        </Badge>
        <span className="text-slate-600">Score {health.score}/100</span>
      </div>

      <Card
        title="Portfolio Overview"
        subtitle={`${health.projectCount} projects · healthiest: ${health.healthiestProjectName ?? '—'} · needs attention: ${health.needsAttentionProjectName ?? '—'}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="pb-2 pr-4">Rank</th>
                <th className="pb-2 pr-4">Project</th>
                <th className="pb-2 pr-4">Health</th>
                <th className="pb-2 pr-4">Bottleneck</th>
                <th className="pb-2 pr-4">Recommendations</th>
                <th className="pb-2 pr-4">Revenue</th>
                <th className="pb-2 pr-4">Transactions</th>
                <th className="pb-2">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {projects
                .slice()
                .sort(
                  (a, b) =>
                    (rankByProject.get(a.projectId) ?? 99) -
                    (rankByProject.get(b.projectId) ?? 99),
                )
                .map((p) => (
                  <tr key={p.projectId} className="text-slate-200">
                    <td className="py-3 pr-4 font-medium text-slate-100">
                      #{rankByProject.get(p.projectId) ?? '—'}
                    </td>
                    <td className="py-3 pr-4">{p.projectName}</td>
                    <td className="py-3 pr-4">
                      <Badge className={FUNNEL_HEALTH_COLOR[p.funnelStatus]}>
                        {p.funnelStatus}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">
                      {p.bottleneckLabel ?? '—'}
                    </td>
                    <td className="py-3 pr-4">
                      {p.openRecommendations}
                      {p.p1RecommendationCount > 0 ? (
                        <span className="text-xs text-amber-300 ml-1">
                          ({p.p1RecommendationCount} P1)
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">
                      {revenueByProject.get(p.projectId)?.totalRevenue != null
                        ? `${revenueByProject.get(p.projectId)!.currency === 'ILS' ? '₪' : '$'}${Math.round(revenueByProject.get(p.projectId)!.totalRevenue)}`
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">
                      {revenueByProject.get(p.projectId)?.transactionCount ?? '—'}
                    </td>
                    <td className="py-3">
                      <Badge
                        className={
                          p.live
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-slate-700 text-slate-400'
                        }
                      >
                        {p.live ? 'live' : 'mock'}
                      </Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
