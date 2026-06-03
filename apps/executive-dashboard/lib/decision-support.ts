import 'server-only';
import { foodtruckBusinessConnectorFromEnv } from '@ai-company/connector-foodtruck-business';
import type { DecisionSupportResult } from '@ai-company/shared-types';

export async function loadDecisionSupportResults(): Promise<DecisionSupportResult[]> {
  const conn = foodtruckBusinessConnectorFromEnv();
  const result = await conn.fetchDecisionSupport();
  return [result];
}
