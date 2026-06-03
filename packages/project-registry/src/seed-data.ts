import type { RegisteredProject } from '@ai-company/shared-types';

/** Canonical registry seed — mirrors supabase/migrations/0006_seed_project_registry.sql */
export function buildInMemoryRegistrySeed(): RegisteredProject[] {
  const defs = [
    {
      id: 'seed-foodtruck-il',
      slug: 'foodtruck-il',
      name: 'FoodTruck-IL',
      description: 'Israeli food truck operations platform.',
      status: 'active' as const,
      enabled: true,
      sortOrder: 10,
    },
    {
      id: 'seed-lab-os',
      slug: 'lab-os',
      name: 'Lab-OS',
      description: 'Laboratory operating system.',
      status: 'active' as const,
      enabled: true,
      sortOrder: 20,
    },
    {
      id: 'seed-inventory-engine',
      slug: 'inventory-engine',
      name: 'Inventory Engine',
      description: 'Generic inventory engine across business lines.',
      status: 'active' as const,
      enabled: true,
      sortOrder: 30,
    },
    {
      id: 'seed-burgerstop',
      slug: 'burgerstop',
      name: 'BurgerStop',
      description: 'BurgerStop franchise operations.',
      status: 'active' as const,
      enabled: true,
      sortOrder: 40,
    },
  ];

  const funnels: Record<string, { stages: Array<{ id: string; label: string; order: number; mock: number }> }> = {
    'foodtruck-il': {
      stages: [
        { id: 'registered', label: 'Registered', order: 0, mock: 12 },
        { id: 'approved', label: 'Approved', order: 1, mock: 11 },
        { id: 'active', label: 'Active', order: 2, mock: 5 },
      ],
    },
    'lab-os': {
      stages: [
        { id: 'lead', label: 'Lead', order: 0, mock: 18 },
        { id: 'demo', label: 'Demo', order: 1, mock: 12 },
        { id: 'pilot', label: 'Pilot', order: 2, mock: 8 },
        { id: 'subscribed', label: 'Subscribed', order: 3, mock: 6 },
        { id: 'active', label: 'Active', order: 4, mock: 5 },
      ],
    },
    'inventory-engine': {
      stages: [
        { id: 'lead', label: 'Lead', order: 0, mock: 9 },
        { id: 'trial', label: 'Trial', order: 1, mock: 6 },
        { id: 'active', label: 'Active', order: 2, mock: 4 },
      ],
    },
    burgerstop: {
      stages: [
        { id: 'lead', label: 'Lead', order: 0, mock: 6 },
        { id: 'meeting', label: 'Meeting', order: 1, mock: 5 },
        { id: 'proposal', label: 'Proposal', order: 2, mock: 4 },
        { id: 'signed', label: 'Signed', order: 3, mock: 3 },
        { id: 'operating', label: 'Operating', order: 4, mock: 3 },
      ],
    },
  };

  const connectors: Record<string, { type: string; config: Record<string, unknown> }> = {
    'foodtruck-il': { type: 'foodtruck-business', config: { adapter: 'foodtruck' } },
    'lab-os': { type: 'mock-funnel', config: {} },
    'inventory-engine': { type: 'mock-funnel', config: {} },
    burgerstop: { type: 'mock-funnel', config: {} },
  };

  return defs.map((d) => {
    const f = funnels[d.slug]!;
    const c = connectors[d.slug]!;
    const mockStageCounts: Record<string, number> = {};
    for (const s of f.stages) mockStageCounts[s.id] = s.mock;
    return {
      definition: d,
      funnel: {
        projectId: d.id,
        projectSlug: d.slug,
        projectName: d.name,
        stages: f.stages.map((s) => ({ id: s.id, label: s.label, order: s.order })),
        mockStageCounts,
      },
      connector: {
        projectId: d.id,
        projectSlug: d.slug,
        connectorType: c.type,
        enabled: true,
        liveCapable: c.type === 'foodtruck-business' && hasFoodTruckCredentials(),
        config: c.config,
      },
    };
  });
}

function hasFoodTruckCredentials(): boolean {
  const url =
    process.env.FOODTRUCK_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const key =
    process.env.FOODTRUCK_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  return Boolean(url && key);
}
