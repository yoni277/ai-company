import type {
  FunnelSnapshot,
  ProjectIntelligenceBundle,
  RegisteredProject,
} from '@ai-company/shared-types';

/**
 * A per-connector-type strategy for turning a registered project into its
 * intelligence bundle + funnel snapshot. Generic platform code never names a
 * specific connector — the instance/composition layer registers a resolver for
 * each connector type it activates (e.g. the FoodTruck resolver is registered
 * from `instances/<company>/`). See GENERIC_PLATFORM_BOUNDARY.md (P015B).
 */
export interface ProjectBundleResolver {
  buildBundle(project: RegisteredProject): Promise<ProjectIntelligenceBundle>;
  buildFunnelSnapshot(project: RegisteredProject): Promise<FunnelSnapshot>;
}

/**
 * Process-wide map of connectorType → resolver. The registry itself is
 * project-agnostic; it only stores whatever the instance layer registers.
 */
const RESOLVERS = new Map<string, ProjectBundleResolver>();

/**
 * Register the resolver for a connector type. Called once per connector type
 * from the composition layer at module-load time, before any portfolio load.
 * Re-registering the same connector type is an error (signals a wiring bug).
 */
export function registerProjectBundleResolver(
  connectorType: string,
  resolver: ProjectBundleResolver,
): void {
  if (RESOLVERS.has(connectorType)) {
    throw new Error(
      `Project bundle resolver for "${connectorType}" already registered`,
    );
  }
  RESOLVERS.set(connectorType, resolver);
}

/** Look up the resolver for a connector type, or undefined if none registered. */
export function getProjectBundleResolver(
  connectorType: string,
): ProjectBundleResolver | undefined {
  return RESOLVERS.get(connectorType);
}
