import { loadRegisteredProjects } from '@ai-company/project-registry';
import type { RegisteredProject, RevenueSnapshot } from '@ai-company/shared-types';
import { createSupabaseLedgerConnector } from './supabase-ledger';
import { MockRevenueConnector } from './mock';
import { getRevenueConnectorResolver } from './revenue-resolver-registry';
import type { RevenueConnector, RevenueSourceConfig, RevenueSourceType } from './types';

export type { RevenueConnector, RevenueSourceConfig, RevenueSourceType } from './types';
// P015B — revenueSource → connector factory registry. The instance layer
// registers a factory per revenue source it activates; generic platform code
// stays project-agnostic.
export {
  registerRevenueConnectorResolver,
  type RevenueConnectorResolver,
} from './revenue-resolver-registry';
export { SupabaseLedgerRevenueConnector, createSupabaseLedgerConnector } from './supabase-ledger';
export { MockRevenueConnector } from './mock';

/** Resolve revenue connector from registry project configuration. */
export function createRevenueConnectorForProject(
  project: RegisteredProject,
): RevenueConnector {
  const config = (project.connector.config ?? {}) as RevenueSourceConfig;
  const source = config.revenueSource ?? 'mock-revenue';
  const slug = project.definition.slug;
  const name = project.definition.name;

  const resolver = getRevenueConnectorResolver(source);
  if (resolver) {
    return resolver(project);
  }

  // Generic fallback when no instance resolver is registered for this source.
  switch (source) {
    case 'supabase-ledger': {
      const ledger = createSupabaseLedgerConnector({
        projectId: slug,
        projectName: name,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        schema: process.env.SUPABASE_SCHEMA ?? 'ai_company',
        config,
      });
      return ledger ?? new MockRevenueConnector(slug, name, config);
    }
    case 'stripe':
    case 'erp':
    case 'csv-import':
      return new MockRevenueConnector(slug, name, { ...config, totalRevenue: 0, transactionCount: 0 });
    case 'mock-revenue':
    default:
      return new MockRevenueConnector(slug, name, config);
  }
}

export async function loadRevenueSnapshots(): Promise<RevenueSnapshot[]> {
  const projects = await loadRegisteredProjects();
  const active = projects.filter(
    (p) => p.definition.enabled && p.definition.status === 'active',
  );
  const connectors = active.map((p) => createRevenueConnectorForProject(p));
  return Promise.all(connectors.map((c) => c.getRevenueSnapshot()));
}
