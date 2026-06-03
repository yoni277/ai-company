import type { FunnelDefinition, TruckRegistryMetrics } from '@ai-company/shared-types';

/** FoodTruck-IL owner funnel — configuration only; engine performs analysis. */
export const FOODTRUCK_FUNNEL_DEFINITION: FunnelDefinition = {
  projectId: 'foodtruck-il',
  projectName: 'FoodTruck-IL',
  stages: [
    { id: 'registered', label: 'Registered', order: 0 },
    { id: 'approved', label: 'Approved', order: 1 },
    { id: 'active', label: 'Active', order: 2 },
  ],
};

/** Map FoodTruck registry counts to generic funnel stage ids. */
export function foodTruckRegistryToStageCounts(
  registry: TruckRegistryMetrics,
): Record<string, number> {
  return {
    registered: registry.totalRegisteredTrucks,
    approved: registry.approvedTrucks,
    active: registry.activeTrucks,
  };
}
