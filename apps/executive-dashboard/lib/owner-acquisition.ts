import 'server-only';
import {
  foodtruckBusinessConnectorFromEnv,
  buildOwnerAcquisitionSummary,
} from '@ai-company/connector-foodtruck-business';
import type { AcquisitionSummary, FoodTruckBusinessMetrics } from '@ai-company/shared-types';

/**
 * Build the FoodTruck-IL owner-acquisition view at the **instance layer** so
 * that the generic platform (`@ai-company/ai-chief-of-staff`) never depends on
 * any FoodTruck-specific connector. This module is allowed to import
 * `@ai-company/connector-foodtruck-business`; the executive packages are not.
 *
 * The Chief of Staff consumes only the typed `AcquisitionSummary` strings
 * returned here — see `DailyBriefMetricsInput.acquisitionSummary` for the
 * cross-package contract.
 */
export async function loadFoodTruckBusinessMetrics(): Promise<{
  metrics: FoodTruckBusinessMetrics;
  /** Deprecated alias for `acquisitionSummary.fallbackSummary`. Kept while existing callers migrate. */
  ownerAcquisitionSummary: string;
  acquisitionSummary: AcquisitionSummary;
}> {
  const connector = foodtruckBusinessConnectorFromEnv();
  const metrics = await connector.fetchMetrics();
  const fallbackSummary = buildOwnerAcquisitionSummary(metrics);
  const promptLine = buildFoodTruckPromptLine(metrics);
  return {
    metrics,
    ownerAcquisitionSummary: fallbackSummary,
    acquisitionSummary: { promptLine, fallbackSummary },
  };
}

/**
 * Compact LLM-prompt line — exact numbers, no narrative. Kept here (and not
 * in the connector package) so that the platform sees only the resulting
 * string, never the per-business phrasing.
 */
function buildFoodTruckPromptLine(metrics: FoodTruckBusinessMetrics): string {
  const r = metrics.registry;
  const a = metrics.acquisition;
  return `FoodTruck: ${r.totalRegisteredTrucks} registered, ${r.approvedTrucks} approved, ${r.pendingTrucks} pending, activation ${a.activationRate}%.`;
}
