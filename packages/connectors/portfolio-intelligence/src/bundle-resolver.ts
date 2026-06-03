import { analyzeFunnel } from '@ai-company/business-funnel-engine';
import { generateDecisionSupport } from '@ai-company/decision-support-engine';
import {
  buildFoodTruckDecisionSupport,
  buildFoodTruckFunnelSnapshot,
  foodtruckBusinessConnectorFromEnv,
  foodTruckDecisionContextFromMetrics,
} from '@ai-company/connector-foodtruck-business';
import type {
  FunnelDefinition,
  FunnelSnapshot,
  ProjectIntelligenceBundle,
  RegisteredProject,
} from '@ai-company/shared-types';

export function registeredProjectToFunnelDefinition(
  project: RegisteredProject,
): FunnelDefinition {
  return {
    projectId: project.definition.slug,
    projectName: project.definition.name,
    stages: project.funnel.stages,
  };
}

export async function buildBundleForProject(
  project: RegisteredProject,
): Promise<ProjectIntelligenceBundle> {
  if (project.connector.connectorType === 'foodtruck-business') {
    return foodTruckBundleFromRegistry(project);
  }
  return mockFunnelBundle(project);
}

export async function buildFunnelSnapshotForProject(
  project: RegisteredProject,
): Promise<FunnelSnapshot> {
  if (project.connector.connectorType === 'foodtruck-business') {
    const conn = foodtruckBusinessConnectorFromEnv();
    return conn.fetchFunnelSnapshot();
  }
  return analyzeFunnel(
    registeredProjectToFunnelDefinition(project),
    project.funnel.mockStageCounts,
  );
}

async function foodTruckBundleFromRegistry(
  project: RegisteredProject,
): Promise<ProjectIntelligenceBundle> {
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
    projectId: project.definition.slug,
    projectName: project.definition.name,
    live: metrics.live,
    funnelStatus: funnel.health.status,
    bottleneckLabel: bn ? `${bn.fromLabel} → ${bn.toLabel}` : null,
    bottleneckRate: bn?.rate ?? null,
    largestDropOffCount: largestDropOff?.lostCount ?? 0,
    decisionActions: decision.actions,
    ...(briefDetail !== undefined ? { briefDetail } : {}),
  };
}

function mockFunnelBundle(project: RegisteredProject): ProjectIntelligenceBundle {
  const funnel = analyzeFunnel(
    registeredProjectToFunnelDefinition(project),
    project.funnel.mockStageCounts,
  );
  return bundleFromFunnel(funnel, false);
}

function bundleFromFunnel(
  funnel: FunnelSnapshot,
  live: boolean,
): ProjectIntelligenceBundle {
  const decision = generateDecisionSupport(funnel);
  const bn = funnel.health.mainBottleneck;
  const largestDropOff = [...funnel.health.dropOffs].sort(
    (a, b) => b.lostCount - a.lostCount,
  )[0];
  return {
    projectId: funnel.projectId,
    projectName: funnel.projectName,
    live,
    funnelStatus: funnel.health.status,
    bottleneckLabel: bn ? `${bn.fromLabel} → ${bn.toLabel}` : null,
    bottleneckRate: bn?.rate ?? null,
    largestDropOffCount: largestDropOff?.lostCount ?? 0,
    decisionActions: decision.actions,
  };
}
