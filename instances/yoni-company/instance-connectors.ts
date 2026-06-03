import 'server-only';
import type { DataConnector } from '@ai-company/connector-framework';
import { FoodTruckIlConnector } from '@ai-company/connector-foodtruck-il';
import { LabOsConnector } from '@ai-company/connector-lab-os';
import { InventoryEngineConnector } from '@ai-company/connector-inventory-engine';
import { WhatsAppEngineConnector } from '@ai-company/connector-whatsapp-engine';

/**
 * Per-instance connector registration.
 *
 * The platform package (`apps/executive-dashboard/lib/platform.ts`) must remain
 * project-agnostic — it never imports a specific connector. This file is the
 * **instance layer's** declaration of "which connectors this company runs" and
 * is the only place allowed to depend on `@ai-company/connector-*` packages.
 *
 * To clone the platform for another company:
 *   1. Replace the imports + factory calls in this file with that company's
 *      connectors.
 *   2. Adjust any env-var fallbacks (e.g. FOODTRUCK_SUPABASE_URL → ACME_*).
 *
 * See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md and
 * docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md leak L4.
 */
export function buildInstanceConnectors(env: NodeJS.ProcessEnv): DataConnector[] {
  // FoodTruck-IL talks to its own Supabase project. The Foodtruck project
  // happens to be the same Postgres host as our `ai_company` schema today,
  // but the connector doesn't assume that — it takes its own credentials so
  // it can move independently.
  //
  // We use `||` (not `??`) so that an empty-string env (FOODTRUCK_SUPABASE_URL=)
  // falls back to NEXT_PUBLIC_SUPABASE_URL instead of being treated as "set but
  // empty". Without this, the connector silently goes into mock mode whenever
  // the .env.local template ships with empty FOODTRUCK_* placeholders.
  const foodTruckUrl =
    env.FOODTRUCK_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
  const foodTruckKey =
    env.FOODTRUCK_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
  const foodTruckConnector =
    foodTruckUrl && foodTruckKey
      ? new FoodTruckIlConnector({ supabaseUrl: foodTruckUrl, serviceRoleKey: foodTruckKey })
      : new FoodTruckIlConnector();

  if (env.AI_COMPANY_LOG_CONNECTOR_MODE === '1') {
    // eslint-disable-next-line no-console
    console.log(
      `[instance] FoodTruck-IL connector: ${
        foodTruckUrl && foodTruckKey ? 'live' : 'mock'
      } (url=${foodTruckUrl ? 'set' : 'unset'}, key=${foodTruckKey ? 'set' : 'unset'})`,
    );
  }

  return [
    foodTruckConnector,
    new LabOsConnector(),
    new InventoryEngineConnector(),
    new WhatsAppEngineConnector(),
  ];
}
