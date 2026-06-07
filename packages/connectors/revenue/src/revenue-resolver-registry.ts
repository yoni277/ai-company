import type { RegisteredProject } from '@ai-company/shared-types';
import type { RevenueConnector } from './types';

/**
 * A per-revenue-source factory that builds a RevenueConnector from a
 * registered project. Generic platform code never names a specific revenue
 * source — the instance/composition layer registers a factory for each
 * revenue source it activates (e.g. the FoodTruck live-events source is
 * registered from `instances/<company>/`). See GENERIC_PLATFORM_BOUNDARY.md
 * (P015B).
 */
export type RevenueConnectorResolver = (
  project: RegisteredProject,
) => RevenueConnector;

/**
 * Process-wide map of revenueSource → factory. The registry itself is
 * project-agnostic; it only stores whatever the instance layer registers.
 */
const RESOLVERS = new Map<string, RevenueConnectorResolver>();

/**
 * Register the factory for a revenue source. Called once per revenue source
 * from the composition layer at module-load time, before any revenue load.
 * Re-registering the same revenue source is an error (signals a wiring bug).
 */
export function registerRevenueConnectorResolver(
  revenueSource: string,
  factory: RevenueConnectorResolver,
): void {
  if (RESOLVERS.has(revenueSource)) {
    throw new Error(
      `Revenue connector resolver for "${revenueSource}" already registered`,
    );
  }
  RESOLVERS.set(revenueSource, factory);
}

/** Look up the factory for a revenue source, or undefined if none registered. */
export function getRevenueConnectorResolver(
  revenueSource: string,
): RevenueConnectorResolver | undefined {
  return RESOLVERS.get(revenueSource);
}
