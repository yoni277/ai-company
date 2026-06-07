import { analyzeFunnel } from '@ai-company/business-funnel-engine';
import { generateDecisionSupport } from '@ai-company/decision-support-engine';
import type {
  FunnelDefinition,
  FunnelSnapshot,
  ProjectIntelligenceBundle,
  RegisteredProject,
} from '@ai-company/shared-types';
import { getProjectBundleResolver } from './bundle-resolver-registry';

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
  const resolver = getProjectBundleResolver(project.connector.connectorType);
  if (resolver) {
    return resolver.buildBundle(project);
  }
  // Generic fallback when no instance resolver is registered for this connector type.
  return mockFunnelBundle(project);
}

export async function buildFunnelSnapshotForProject(
  project: RegisteredProject,
): Promise<FunnelSnapshot> {
  const resolver = getProjectBundleResolver(project.connector.connectorType);
  if (resolver) {
    return resolver.buildFunnelSnapshot(project);
  }
  // Generic fallback when no instance resolver is registered for this connector type.
  return analyzeFunnel(
    registeredProjectToFunnelDefinition(project),
    project.funnel.mockStageCounts,
  );
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
