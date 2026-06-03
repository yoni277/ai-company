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
  CHIEF_OF_STAFF_ID,
} from '@ai-company/ai-chief-of-staff';
import { Cto, buildDefaultCto, CTO_ID } from '@ai-company/ai-cto';
import {
  VpMarketing,
  buildDefaultVpMarketing,
  VP_MARKETING_ID,
} from '@ai-company/ai-vp-marketing';
import { Cfo, buildDefaultCfo, CFO_ID } from '@ai-company/ai-cfo';
import { Coo, buildDefaultCoo, COO_ID } from '@ai-company/ai-coo';
import { VpSales, buildDefaultVpSales, VP_SALES_ID } from '@ai-company/ai-vp-sales';
import {
  buildDefaultExecutiveTeam,
  type ExecutiveTeam,
} from '@ai-company/ai-executive-team';
import { FoodTruckIlConnector } from '@ai-company/connector-foodtruck-il';
import { LabOsConnector } from '@ai-company/connector-lab-os';
import { InventoryEngineConnector } from '@ai-company/connector-inventory-engine';
import { WhatsAppEngineConnector } from '@ai-company/connector-whatsapp-engine';

export interface ExecutiveDescriptor {
  id: string;
  displayName: string;
  slug: string;        // URL slug for the dashboard tab
  briefingPath: string;  // POST endpoint that produces a fresh briefing
}

export interface Platform {
  repos: Repositories;
  registry: ConnectorRegistry;
  orchestrator: SyncOrchestrator;
  chiefOfStaff: ChiefOfStaff;
  cto: Cto;
  vpMarketing: VpMarketing;
  cfo: Cfo;
  coo: Coo;
  vpSales: VpSales;
  executiveTeam: ExecutiveTeam;
  executives: ExecutiveDescriptor[];
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

  // FoodTruck-IL talks to its own Supabase project. The Foodtruck project happens
  // to be the same Postgres host as our `ai_company` schema today, but the connector
  // doesn't assume that — it takes its own credentials so it can move independently.
  const foodTruckUrl = process.env.FOODTRUCK_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const foodTruckKey =
    process.env.FOODTRUCK_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const foodTruckConnector =
    foodTruckUrl && foodTruckKey
      ? new FoodTruckIlConnector({ supabaseUrl: foodTruckUrl, serviceRoleKey: foodTruckKey })
      : new FoodTruckIlConnector();

  const all = [
    foodTruckConnector,
    new LabOsConnector(),
    new InventoryEngineConnector(),
    new WhatsAppEngineConnector(),
  ];
  registry.registerMany(
    active.length === 0 ? all : all.filter((c) => active.includes(c.name)),
  );

  const orchestrator = new SyncOrchestrator(registry, repos);
  const chiefOfStaff = buildDefaultChiefOfStaff();
  const cto = buildDefaultCto();
  const vpMarketing = buildDefaultVpMarketing();
  const cfo = buildDefaultCfo();
  const coo = buildDefaultCoo();
  const vpSales = buildDefaultVpSales();

  const executives: ExecutiveDescriptor[] = [
    {
      id: CHIEF_OF_STAFF_ID,
      displayName: chiefOfStaff.displayName,
      slug: 'chief-of-staff',
      briefingPath: '/api/chief-of-staff/briefing',
    },
    {
      id: CTO_ID,
      displayName: cto.displayName,
      slug: 'cto',
      briefingPath: '/api/cto/briefing',
    },
    {
      id: COO_ID,
      displayName: coo.displayName,
      slug: 'coo',
      briefingPath: '/api/coo/briefing',
    },
    {
      id: CFO_ID,
      displayName: cfo.displayName,
      slug: 'cfo',
      briefingPath: '/api/cfo/briefing',
    },
    {
      id: VP_MARKETING_ID,
      displayName: vpMarketing.displayName,
      slug: 'vp-marketing',
      briefingPath: '/api/vp-marketing/briefing',
    },
    {
      id: VP_SALES_ID,
      displayName: vpSales.displayName,
      slug: 'vp-sales',
      briefingPath: '/api/vp-sales/briefing',
    },
  ];

  const executiveTeam = buildDefaultExecutiveTeam(
    repos,
    executives.map((e) => ({ id: e.id, displayName: e.displayName })),
  );

  cached = {
    repos,
    registry,
    orchestrator,
    chiefOfStaff,
    cto,
    vpMarketing,
    cfo,
    coo,
    vpSales,
    executiveTeam,
    executives,
  };
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
