import type { Phase2Snapshot } from '@ai-company/shared-types';
import { Badge, Card, EmptyState, Stat } from './Card';
import { SEVERITY_COLOR, relativeTime } from '../lib/format';
import type { DailyBrief } from '@ai-company/shared-types';

const LEVEL_COLOR = {
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  yellow: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  red: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
} as const;

export function ProductionMetricsPanel({
  snapshot,
  dailyBrief,
}: {
  snapshot: Phase2Snapshot;
  dailyBrief: DailyBrief | null;
}) {
  const { github, supabase, health, topRisks, pendingApprovals } = snapshot;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Phase 2 · Production metrics</span>
        <Badge className={snapshot.githubLive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}>
          GitHub {snapshot.githubLive ? 'live' : 'mock'}
        </Badge>
        <Badge className={snapshot.supabaseLive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}>
          Supabase {snapshot.supabaseLive ? 'live' : 'mock'}
        </Badge>
      </div>

      <Card title="Company health" subtitle="Deterministic score (no AI)">
        <div className="flex items-center gap-6">
          <Stat label="Score" value={`${health.score}/100`} />
          <Stat
            label="Level"
            value={<Badge className={LEVEL_COLOR[health.level]}>{health.level}</Badge>}
          />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="GitHub metrics" subtitle={github.repositoryName}>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Open issues" value={github.openIssues} />
            <Stat label="Open PRs" value={github.openPullRequests} />
            <Stat label="Commits (7d)" value={github.commitsLast7Days} />
          </div>
        </Card>

        <Card title="Supabase metrics" subtitle="Platform database (read-only)">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Projects tracked" value={supabase.userCount} />
            <Stat label="Recent activity (7d)" value={supabase.recentActivityCount} />
            <Stat
              label="DB healthy"
              value={supabase.databaseHealthy ? 'Yes' : 'No'}
            />
            <Stat label="Metric writes (7d)" value={supabase.transactionCount} />
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Top risks" subtitle="Open risks by severity">
          {topRisks.length === 0 ? (
            <EmptyState>No open risks.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {topRisks.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-start gap-3">
                  <Badge className={SEVERITY_COLOR[r.severity]}>{r.severity}</Badge>
                  <div>
                    <div className="text-sm text-slate-100">{r.description}</div>
                    <div className="text-xs text-slate-500">
                      {r.source} · {relativeTime(r.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Pending approvals" subtitle="Items requiring CEO attention">
          {pendingApprovals.length === 0 ? (
            <EmptyState>No pending approvals.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {pendingApprovals.map((a) => (
                <li key={a.id} className="text-sm text-slate-100">
                  {a.label}
                  <div className="text-xs text-slate-500">
                    {a.projectName ?? 'Platform'} · {a.source}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {dailyBrief ? (
        <Card title="Daily CEO brief" subtitle="AI explains pre-computed metrics only">
          <p className="text-sm text-slate-100 mb-4">{dailyBrief.companyHealth}</p>
          <div className="mb-4">
            <div className="text-xs text-slate-500 mb-1">Owner acquisition summary</div>
            <p className="text-sm text-slate-200">{dailyBrief.ownerAcquisitionSummary}</p>
          </div>
          {dailyBrief.funnelSummaries.length > 0 ? (
            <div className="mb-4">
              <div className="text-xs text-slate-500 mb-1">Funnel summary</div>
              <ul className="text-sm text-slate-200 space-y-1">
                {dailyBrief.funnelSummaries.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {dailyBrief.portfolioSummary ? (
            <div className="mb-4">
              <div className="text-xs text-slate-500 mb-1">Portfolio summary</div>
              <p className="text-sm text-slate-200">{dailyBrief.portfolioSummary}</p>
            </div>
          ) : null}
          {dailyBrief.revenueSummaries.length > 0 ? (
            <div className="mb-4">
              <div className="text-xs text-slate-500 mb-1">Revenue summary</div>
              <ul className="text-sm text-slate-200 space-y-1">
                {dailyBrief.revenueSummaries.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {dailyBrief.recommendedActions.length > 0 ? (
            <div className="mb-4">
              <div className="text-xs text-slate-500 mb-1">Recommended actions</div>
              <ul className="text-sm text-slate-200 space-y-1">
                {dailyBrief.recommendedActions.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500 mb-2">Top risks</div>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {dailyBrief.topRisks.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-2">Opportunities</div>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {dailyBrief.opportunities.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-2">Approvals waiting</div>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {dailyBrief.approvalsWaiting.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
