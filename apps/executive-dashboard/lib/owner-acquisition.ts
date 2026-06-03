import 'server-only';
import {
  foodtruckBusinessConnectorFromEnv,
  buildOwnerAcquisitionSummary,
} from '@ai-company/connector-foodtruck-business';
import type { FoodTruckBusinessMetrics } from '@ai-company/shared-types';

export async function loadFoodTruckBusinessMetrics(): Promise<{
  metrics: FoodTruckBusinessMetrics;
  ownerAcquisitionSummary: string;
}> {
  const connector = foodtruckBusinessConnectorFromEnv();
  const metrics = await connector.fetchMetrics();
  const ownerAcquisitionSummary = buildOwnerAcquisitionSummary(metrics);
  return { metrics, ownerAcquisitionSummary };
}
