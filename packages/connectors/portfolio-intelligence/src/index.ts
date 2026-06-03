import { loadRegisteredProjects } from '@ai-company/project-registry';
import {
  aggregatePortfolioIntelligence,
  formatPortfolioSummary,
} from '@ai-company/portfolio-intelligence-engine';
import type {
  DecisionSupportResult,
  FunnelSnapshot,
  PortfolioIntelligenceSnapshot,
  ProjectIntelligenceBundle,
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
}

/**
 * Collect per-project intelligence from the project registry and aggregate.
 */
export async function loadPortfolioIntelligence(): Promise<PortfolioIntelligenceLoadResult> {
  const registered = await loadRegisteredProjects();
  const active = registered.filter((p) => p.definition.enabled && p.definition.status === 'active');

  const bundles = await Promise.all(active.map((p) => buildBundleForProject(p)));
  const funnels = await Promise.all(active.map((p) => buildFunnelSnapshotForProject(p)));
  const portfolio = aggregatePortfolioIntelligence(bundles);
  const decisionSupport = bundles.map((b) => ({
    projectId: b.projectId,
    projectName: b.projectName,
    actions: b.decisionActions,
    generatedAt: new Date().toISOString(),
  }));

  return { portfolio, funnels, decisionSupport, bundles };
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
