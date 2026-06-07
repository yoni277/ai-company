import 'server-only';
import {
  createRepositories,
  envFromProcessEnv,
  type Repositories,
} from '@ai-company/database';
// The active instance's config lives outside the dashboard app — see
// instances/yoni-company/. The dashboard never names the company directly;
// `@active-instance/*` is a tsconfig path alias that points at whatever
// instance directory the operator has chosen. To clone the platform for a
// different company, change one alias in apps/executive-dashboard/tsconfig.json.
import { INSTANCE_PROJECTS_SEED } from '@active-instance/instance-seed';
import { buildInstanceRegistrySeed } from '@active-instance/project-registry-seed';
import { getInstanceProjectMetadata } from '@active-instance/project-executive-metadata';
import { registerInstanceRegistrySeed } from '@ai-company/project-registry';
import {
  ConnectorRegistry,
  SyncOrchestrator,
  type DataConnector,
} from '@ai-company/connector-framework';
import {
  ChiefOfStaff,
  buildDefaultChiefOfStaff,
  CHIEF_OF_STAFF_ID,
  createChiefOfStaffDirectiveResponder,
  registerDirectiveResponder,
  registerInstanceProjectMetadata,
  registerResearchCapability,
} from '@ai-company/ai-chief-of-staff';
import { AnthropicWebSearchResearchCapability } from '@active-instance/research-capability';
import {
  Cto,
  buildDefaultCto,
  CTO_ID,
  createCtoDirectiveResponder,
} from '@ai-company/ai-cto';
import {
  VpMarketing,
  buildDefaultVpMarketing,
  VP_MARKETING_ID,
  createVpMarketingDirectiveResponder,
} from '@ai-company/ai-vp-marketing';
import {
  Cfo,
  buildDefaultCfo,
  CFO_ID,
  createCfoDirectiveResponder,
} from '@ai-company/ai-cfo';
import {
  Coo,
  buildDefaultCoo,
  COO_ID,
  createCooDirectiveResponder,
} from '@ai-company/ai-coo';
import {
  VpSales,
  buildDefaultVpSales,
  VP_SALES_ID,
  createVpSalesDirectiveResponder,
} from '@ai-company/ai-vp-sales';
import {
  buildDefaultExecutiveTeam,
  type ExecutiveTeam,
} from '@ai-company/ai-executive-team';
// Instance connectors are registered through lib/instance-connectors.ts so
// that this platform module stays project-agnostic. Do NOT re-introduce
// connector-foodtruck-* / connector-lab-os / connector-inventory-engine /
// connector-whatsapp-engine imports here — they belong in the instance layer.
// See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md leak L4.
import { buildInstanceConnectors } from '@active-instance/instance-connectors';

// Register the instance-layer project-registry seed at module load time, before
// any caller invokes `ProjectRegistryService.loadProjects()`. The platform's
// project-registry package no longer hardcodes a project list — it asks the
// instance layer. See GENERIC_PLATFORM_BOUNDARY.md leak L8.
registerInstanceRegistrySeed(buildInstanceRegistrySeed);

// Register the instance-layer project executive metadata (vendors / marketing
// channels / sales channels) so that COO / VP Marketing executives can read
// per-project hints without the platform packages naming any vendor or channel.
// See GENERIC_PLATFORM_BOUNDARY.md leaks L2 + L3.
registerInstanceProjectMetadata(getInstanceProjectMetadata);

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
  // Attach the instance-layer mock seed so that `AI_COMPANY_DATA_MODE=mock`
  // pre-populates this company's projects. The platform package itself never
  // names a project — the seed lives in lib/instance-seed.ts and the platform
  // simply receives it. See GENERIC_PLATFORM_BOUNDARY.md leak L6.
  const env = envFromProcessEnv();
  env.mockSeed = INSTANCE_PROJECTS_SEED;
  const repos = createRepositories(env);

  const registry = new ConnectorRegistry();
  const active = (process.env.AI_COMPANY_ACTIVE_CONNECTORS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Instance-supplied connector list. The platform never imports a specific
  // connector — `instance-connectors.ts` owns all project-specific wiring
  // (credentials, mock fallback, diagnostic logging). The platform stays
  // generic and only applies the AI_COMPANY_ACTIVE_CONNECTORS allow-list filter,
  // which is slug-agnostic.
  const all = buildInstanceConnectors(process.env);
  registry.registerMany(
    active.length === 0 ? all : all.filter((c: DataConnector) => active.includes(c.name)),
  );

  const orchestrator = new SyncOrchestrator(registry, repos);
  const chiefOfStaff = buildDefaultChiefOfStaff();
  const cto = buildDefaultCto();
  const vpMarketing = buildDefaultVpMarketing();
  const cfo = buildDefaultCfo();
  const coo = buildDefaultCoo();
  const vpSales = buildDefaultVpSales();

  // Register each executive's DirectiveResponder so the queue worker can
  // dispatch by id alone. The worker never branches on executive name — it
  // just calls REGISTRY[executive_id].run(...). To add a new AI executive
  // (e.g. for AI-Law-Firm), publish a package that exposes its own factory
  // and register it here. No queue code change required.
  registerDirectiveResponder(createChiefOfStaffDirectiveResponder(chiefOfStaff));
  registerDirectiveResponder(createCtoDirectiveResponder(cto));
  registerDirectiveResponder(createCooDirectiveResponder(coo));
  registerDirectiveResponder(createCfoDirectiveResponder(cfo));
  registerDirectiveResponder(createVpMarketingDirectiveResponder(vpMarketing));
  registerDirectiveResponder(createVpSalesDirectiveResponder(vpSales));

  // Phase 2A — Operational Validation Blocker Exception (D022).
  // Register the instance research backend so VP Marketing's Anthropic
  // client can dispatch its `research` tool calls through it. Skipped when
  // no Anthropic key is present (fake LLM path doesn't research).
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const config: { apiKey: string; model?: string } = { apiKey: anthropicKey };
    if (process.env.ANTHROPIC_MODEL) config.model = process.env.ANTHROPIC_MODEL;
    registerResearchCapability(new AnthropicWebSearchResearchCapability(config));
  }

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

// P006B — `ensureSeededMockData` was removed 2026-06-06.
// Runtime page renders are now pure reads. Seeding is an explicit operator
// action — see `pnpm cli:seed-instance`. If this function returns by another
// name, the audit-leaks gate fails (see scripts/audit-leaks.mjs).
