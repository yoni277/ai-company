import 'server-only';
import type {
  FunnelSnapshot,
  ProjectIntelligenceBundle,
  RegisteredProject,
} from '@ai-company/shared-types';
import { registerProjectBundleResolver } from '@ai-company/connector-portfolio-intelligence';
import {
  registerRevenueConnectorResolver,
  type RevenueConnector,
  type RevenueSourceConfig,
} from '@ai-company/connector-revenue';
import {
  foodtruckBusinessConnectorFromEnv,
  buildFoodTruckFunnelSnapshot,
  buildFoodTruckDecisionSupport,
  foodTruckDecisionContextFromMetrics,
  createFoodTruckRevenueConnector,
} from '@ai-company/connector-foodtruck-business';

/**
 * Per-instance connector-type resolver registration. This is the instance/
 * composition seam that teaches the GENERIC portfolio-intelligence + revenue
 * registries how to serve this company's connector types. The generic packages
 * never name a connector — they ask the registry, which the instance populates
 * here. To clone the platform for a different company, ship a different
 * instance-resolvers.ts. See GENERIC_PLATFORM_BOUNDARY.md (P015B).
 */

// FoodTruck intelligence bundle — mirrors the (soon-to-be-removed) legacy
// foodTruckBundleFromRegistry assembly in portfolio-intelligence/bundle-resolver.ts.
async function buildFoodTruckBundle(
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
  const inactive = Math.max(
    0,
    metrics.registry.approvedTrucks - metrics.registry.activeTrucks,
  );
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

async function buildFoodTruckFunnelSnapshotForProject(
  _project: RegisteredProject,
): Promise<FunnelSnapshot> {
  const conn = foodtruckBusinessConnectorFromEnv();
  return conn.fetchFunnelSnapshot();
}

function foodTruckRevenueFactory(project: RegisteredProject): RevenueConnector {
  const config = (project.connector.config ?? {}) as RevenueSourceConfig;
  return createFoodTruckRevenueConnector({
    projectId: project.definition.slug,
    projectName: project.definition.name,
    config,
  });
}

let registered = false;

/**
 * Register this instance's concrete connector-type resolvers into the generic
 * portfolio-intelligence + revenue registries. Invoked once at platform
 * composition time (lib/platform.ts), before any portfolio/revenue load.
 * Idempotent — the registries themselves throw on duplicate registration.
 */
export function registerInstanceResolvers(): void {
  if (registered) return;
  registered = true;

  registerProjectBundleResolver('foodtruck-business', {
    buildBundle: buildFoodTruckBundle,
    buildFunnelSnapshot: buildFoodTruckFunnelSnapshotForProject,
  });
  registerRevenueConnectorResolver(
    'foodtruck-supabase-events',
    foodTruckRevenueFactory,
  );
}
