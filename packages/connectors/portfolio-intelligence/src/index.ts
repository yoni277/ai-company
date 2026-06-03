import { loadRegisteredProjects } from '@ai-company/project-registry';
import { loadRevenueSnapshots } from '@ai-company/connector-revenue';
import { aggregatePortfolioRevenue } from '@ai-company/revenue-intelligence-engine';
import {
  aggregatePortfolioIntelligence,
  formatPortfolioSummary,
} from '@ai-company/portfolio-intelligence-engine';
import type {
  DecisionSupportResult,
  FunnelSnapshot,
  PortfolioIntelligenceSnapshot,
  ProjectIntelligenceBundle,
  RevenueSnapshot,
} from '@ai-company/shared-types';
import {
  buildBundleForProject,
  buildFunnelSnapshotForProject,
} from './bundle-resolver';

export interface PortfolioIntelligenceLoadResult {
  portfolio: PortfolioIntelligenceSnapshot;
  funnels: FunnelSnapshot[];
  decisionSupport: DecisionSupportResult[];
  bundles: ProjectIntelligenceBundle[];
  revenueSnapshots: RevenueSnapshot[];
}

/**
 * Collect per-project intelligence from the project registry and aggregate.
 */
export async function loadPortfolioIntelligence(): Promise<PortfolioIntelligenceLoadResult> {
  const registered = await loadRegisteredProjects();
  const active = registered.filter((p) => p.definition.enabled && p.definition.status === 'active');

  const [bundles, funnels, revenueSnapshots] = await Promise.all([
    Promise.all(active.map((p) => buildBundleForProject(p))),
    Promise.all(active.map((p) => buildFunnelSnapshotForProject(p))),
    loadRevenueSnapshots(),
  ]);
  const revenue = aggregatePortfolioRevenue(revenueSnapshots);
  const portfolio = aggregatePortfolioIntelligence(bundles, revenue);
  const decisionSupport = bundles.map((b) => ({
    projectId: b.projectId,
    projectName: b.projectName,
    actions: b.decisionActions,
    generatedAt: new Date().toISOString(),
  }));

  return { portfolio, funnels, decisionSupport, bundles, revenueSnapshots };
}

export function portfolioSummaryFromLoad(result: PortfolioIntelligenceLoadResult): string {
  const topId = result.portfolio.priorities[0]?.projectId;
  const topBundle = result.bundles.find((b) => b.projectId === topId);
  const detail = topBundle?.briefDetail;
  return formatPortfolioSummary(
    result.portfolio,
    detail !== undefined ? { topProjectBriefDetail: detail } : undefined,
  );
}
