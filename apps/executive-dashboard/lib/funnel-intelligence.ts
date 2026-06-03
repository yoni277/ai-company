import 'server-only';
import { foodtruckBusinessConnectorFromEnv } from '@ai-company/connector-foodtruck-business';
import type { FunnelSnapshot } from '@ai-company/shared-types';

export async function loadFunnelSnapshots(): Promise<FunnelSnapshot[]> {
  const conn = foodtruckBusinessConnectorFromEnv();
  const snapshot = await conn.fetchFunnelSnapshot();
  return [snapshot];
}
