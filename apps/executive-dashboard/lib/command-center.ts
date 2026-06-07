import 'server-only';
import type {
  PortfolioIntelligenceSnapshot,
  RecommendedAction,
} from '@ai-company/shared-types';
import { loadPhase2Snapshot, type Phase2Snapshot } from './phase2-metrics';
import { loadPortfolioIntelligenceForDashboard } from './portfolio-intelligence';
import { loadProjectRegistryView } from './project-registry';
import type { Repositories } from '@ai-company/database';
import type { PortfolioIntelligenceLoadResult } from './portfolio-intelligence';

export type ExecutiveScoreStatus = 'PASS' | 'PASS WITH RISKS' | 'FAIL';

export interface ExecutiveScorecardRow {
  role: string;
  status: ExecutiveScoreStatus;
  detail: string;
}

export interface CommandCenterHighlights {
  topPriorityProject: string;
  topPriorityReason: string;
  topBottleneck: string;
  topRisk: string;
  topActionTitle: string;
  topActionProject: string;
}

export interface CommandCenterMaturity {
  portfolioRevenue: number;
  portfolioCurrency: string;
  liveProjectCount: number;
  mockProjectCount: number;
  totalProjects: number;
}

export interface CommandCenterPayload {
  highlights: CommandCenterHighlights;
  maturity: CommandCenterMaturity;
  scorecard: ExecutiveScorecardRow[];
  phase2: Phase2Snapshot;
  portfolio: PortfolioIntelligenceSnapshot;
  topP1Action: RecommendedAction | null;
  generatedAt: string;
}

function firstP1Action(portfolio: PortfolioIntelligenceSnapshot): RecommendedAction | null {
  const actions = portfolio.actionQueue?.actions ?? [];
  return actions.find((a) => a.priority === 'P1') ?? actions[0] ?? null;
}

// Generic, slug-agnostic top-risk label. Uses the highest-priority action's
// reason/title as the headline risk; the platform no longer parses any
// business-specific action id (e.g. an inactive-entity count).
function topRiskLabel(
  portfolio: PortfolioIntelligenceSnapshot,
  topP1: RecommendedAction | null,
): string {
  return topP1?.reason ?? topP1?.title ?? 'No risks flagged';
}

function buildHighlights(
  portfolio: PortfolioIntelligenceSnapshot,
  topP1: RecommendedAction | null,
): CommandCenterHighlights {
  const top = portfolio.priorities[0];
  const topProject = portfolio.projects.find((p) => p.projectId === top?.projectId);
  return {
    topPriorityProject: top?.projectName ?? '—',
    topPriorityReason: top?.reason ?? 'No priorities configured',
    topBottleneck: topProject?.bottleneckLabel ?? '—',
    topRisk: topRiskLabel(portfolio, topP1),
    topActionTitle: topP1?.title ?? 'No actions in queue',
    topActionProject: topP1?.projectName ?? '—',
  };
}

function buildMaturity(portfolio: PortfolioIntelligenceSnapshot): CommandCenterMaturity {
  const live = portfolio.projects.filter((p) => p.live).length;
  const total = portfolio.projects.length;
  const totals = portfolio.revenue?.totals;
  return {
    portfolioRevenue: totals?.totalRevenue ?? 0,
    portfolioCurrency: totals?.currency ?? 'ILS',
    liveProjectCount: live,
    mockProjectCount: total - live,
    totalProjects: total,
  };
}

function buildScorecard(
  phase2: Phase2Snapshot,
  portfolio: PortfolioIntelligenceSnapshot,
  registryValid: boolean,
  registrySource: string,
  maturity: CommandCenterMaturity,
): ExecutiveScorecardRow[] {
  const githubOk = phase2.githubLive;
  const supabaseOk = phase2.supabaseLive && phase2.supabase.databaseHealthy;
  const registryOk = registryValid && registrySource === 'database';
  const funnelOk = portfolio.projects.length > 0;
  const approvalsVisible = true;
  const cfoRisks = maturity.mockProjectCount > 0;

  return [
    {
      role: 'CEO',
      status: 'PASS',
      detail: 'Command center data loaded; action queue accessible',
    },
    {
      role: 'CTO',
      status: githubOk && supabaseOk && registryOk ? 'PASS' : 'PASS WITH RISKS',
      detail: `GitHub ${githubOk ? 'live' : 'mock'} · Supabase ${supabaseOk ? 'healthy' : 'degraded'} · Registry ${registrySource}`,
    },
    {
      role: 'COO',
      status: funnelOk && approvalsVisible ? 'PASS' : 'FAIL',
      detail: `Funnel intelligence active · ${phase2.pendingApprovals.length} pending approval(s)`,
    },
    {
      role: 'CFO',
      status: cfoRisks ? 'PASS WITH RISKS' : 'PASS',
      detail: cfoRisks
        ? `Data maturity gap: ${maturity.mockProjectCount}/${maturity.totalProjects} projects on mock revenue`
        : 'All projects reporting live revenue',
    },
    {
      role: 'Chief of Staff',
      status: 'PASS',
      detail: 'Daily brief pipeline and portfolio summary available',
    },
  ];
}

export async function loadCommandCenterData(
  repos: Repositories,
): Promise<CommandCenterPayload> {
  const portfolioLoad: PortfolioIntelligenceLoadResult =
    await loadPortfolioIntelligenceForDashboard();
  const portfolio = portfolioLoad.portfolio;
  const [phase2, registry] = await Promise.all([
    loadPhase2Snapshot(repos),
    loadProjectRegistryView(portfolio),
  ]);

  const topP1 = firstP1Action(portfolio);
  const maturity = buildMaturity(portfolio);
  const highlights = buildHighlights(portfolio, topP1);
  const scorecard = buildScorecard(
    phase2,
    portfolio,
    registry.validation.valid,
    registry.source,
    maturity,
  );

  return {
    highlights,
    maturity,
    scorecard,
    phase2,
    portfolio,
    topP1Action: topP1,
    generatedAt: new Date().toISOString(),
  };
}
