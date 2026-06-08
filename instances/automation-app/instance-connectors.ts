import 'server-only';
import type { DataConnector } from '@ai-company/connector-framework';

/**
 * Per-instance connector registration.
 *
 * The platform package (`apps/executive-dashboard/lib/platform.ts`) must remain
 * project-agnostic — it never imports a specific connector. This file is the
 * **instance layer's** declaration of "which connectors this company runs" and
 * is the only place allowed to depend on `@ai-company/connector-*` packages.
 *
 * automation-app is PRE-PRODUCT: there are no live connectors yet. We return an
 * empty set so the platform composes cleanly with zero data sources; the
 * dashboard renders the marketplace project from the mock seed and the generic
 * mock fallback. When the first real backend exists, import its connector here
 * and add it to the returned array — no platform change required.
 *
 * See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md and
 * docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md leak L4.
 */
export function buildInstanceConnectors(env: NodeJS.ProcessEnv): DataConnector[] {
  if (env.AI_COMPANY_LOG_CONNECTOR_MODE === '1') {
    // eslint-disable-next-line no-console
    console.log('[instance] automation-app: no live connectors (pre-product)');
  }
  return [];
}
