import { analyzeFunnel } from '@ai-company/business-funnel-engine';
import {
  buildFoodTruckDecisionSupport,
  buildFoodTruckFunnelSnapshot,
  foodtruckBusinessConnectorFromEnv,
  foodTruckDecisionContextFromMetrics,
} from '@ai-company/connector-foodtruck-business';
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
  BURGERSTOP_FUNNEL,
  burgerStopPlaceholderBundle,
  INVENTORY_FUNNEL,
  inventoryEnginePlaceholderBundle,
  LAB_OS_FUNNEL,
  labOsPlaceholderBundle,
} from './project-configs';

export interface PortfolioIntelligenceLoadResult {
  portfolio: PortfolioIntelligenceSnapshot;
  funnels: FunnelSnapshot[];
  decisionSupport: DecisionSupportResult[];
  bundles: ProjectIntelligenceBundle[];
}

/**
 * Collect per-project intelligence and aggregate portfolio view.
 * FoodTruck-IL is project #1 (live when configured); others use placeholder funnels.
 */
export async function loadPortfolioIntelligence(): Promise<PortfolioIntelligenceLoadResult> {
  const bundles = await collectProjectBundles();
  const portfolio = aggregatePortfolioIntelligence(bundles);
  const funnels = await collectFunnelSnapshots();
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

async function collectProjectBundles(): Promise<ProjectIntelligenceBundle[]> {
  const foodTruck = await foodTruckBundle();
  return [
    foodTruck,
    labOsPlaceholderBundle(),
    inventoryEnginePlaceholderBundle(),
    burgerStopPlaceholderBundle(),
  ];
}

async function foodTruckBundle(): Promise<ProjectIntelligenceBundle> {
  const conn = foodtruckBusinessConnectorFromEnv();
  const metrics = await conn.fetchMetrics();
  const funnel = buildFoodTruckFunnelSnapshot(metrics.registry);
  const decision = buildFoodTruckDecisionSupport(
    funnel,
    foodTruckDecisionContextFromMetrics(metrics),
  );
  const bn = funnel.health.mainBottleneck;
  const largestDropOff = [...funnel.health.dropOffs].sort(
    (a, b) => b.lostCount - a.lostCount,
  )[0];
  const inactive = Math.max(0, metrics.registry.approvedTrucks - metrics.registry.activeTrucks);
  const briefDetail =
    inactive > 0
      ? `${inactive} inactive approved truck${inactive === 1 ? '' : 's'}`
      : undefined;

  return {
    projectId: funnel.projectId,
    projectName: funnel.projectName,
    live: metrics.live,
    funnelStatus: funnel.health.status,
    bottleneckLabel: bn ? `${bn.fromLabel} → ${bn.toLabel}` : null,
    bottleneckRate: bn?.rate ?? null,
    largestDropOffCount: largestDropOff?.lostCount ?? 0,
    decisionActions: decision.actions,
    ...(briefDetail !== undefined ? { briefDetail } : {}),
  };
}

async function collectFunnelSnapshots(): Promise<FunnelSnapshot[]> {
  const conn = foodtruckBusinessConnectorFromEnv();
  const foodTruck = await conn.fetchFunnelSnapshot();
  return [
    foodTruck,
    analyzeFunnel(LAB_OS_FUNNEL, { lead: 18, demo: 12, pilot: 8, subscribed: 6, active: 5 }),
    analyzeFunnel(INVENTORY_FUNNEL, { lead: 9, trial: 6, active: 4 }),
    analyzeFunnel(BURGERSTOP_FUNNEL, { lead: 6, meeting: 5, proposal: 4, signed: 3, operating: 3 }),
  ];
}
