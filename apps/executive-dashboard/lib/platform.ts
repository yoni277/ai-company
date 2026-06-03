import 'server-only';
import {
  createRepositories,
  envFromProcessEnv,
  type Repositories,
} from '@ai-company/database';
import {
  ConnectorRegistry,
  SyncOrchestrator,
} from '@ai-company/connector-framework';
import {
  ChiefOfStaff,
  buildDefaultChiefOfStaff,
} from '@ai-company/ai-chief-of-staff';
import { FoodTruckIlConnector } from '@ai-company/connector-foodtruck-il';
import { LabOsConnector } from '@ai-company/connector-lab-os';
import { InventoryEngineConnector } from '@ai-company/connector-inventory-engine';
import { WhatsAppEngineConnector } from '@ai-company/connector-whatsapp-engine';

export interface Platform {
  repos: Repositories;
  registry: ConnectorRegistry;
  orchestrator: SyncOrchestrator;
  chiefOfStaff: ChiefOfStaff;
}

let cached: Platform | null = null;

/**
 * Single platform instance per Node process. Wires every package together so
 * route handlers and server components don't repeat the assembly.
 */
export function getPlatform(): Platform {
  if (cached) return cached;
  const repos = createRepositories(envFromProcessEnv());

  const registry = new ConnectorRegistry();
  const active = (process.env.AI_COMPANY_ACTIVE_CONNECTORS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const all = [
    new FoodTruckIlConnector(),
    new LabOsConnector(),
    new InventoryEngineConnector(),
    new WhatsAppEngineConnector(),
  ];
  registry.registerMany(
    active.length === 0 ? all : all.filter((c) => active.includes(c.name)),
  );

  const orchestrator = new SyncOrchestrator(registry, repos);
  const chiefOfStaff = buildDefaultChiefOfStaff();

  cached = { repos, registry, orchestrator, chiefOfStaff };
  return cached;
}

/**
 * First-load helper: if the demo has zero metrics, run a sync so the dashboard
 * never renders empty. Idempotent — subsequent calls are no-ops once we have data.
 */
export async function ensureSeededMockData(): Promise<void> {
  const platform = getPlatform();
  const projects = await platform.repos.projects.list();
  if (projects.length === 0) {
    await platform.orchestrator.runAll();
    return;
  }
  // Even if projects exist, check whether metrics are present.
  const first = projects[0]!;
  const metrics = await platform.repos.metrics.listLatestByProject(first.id, 1);
  if (metrics.length === 0) {
    await platform.orchestrator.runAll();
  }
}
