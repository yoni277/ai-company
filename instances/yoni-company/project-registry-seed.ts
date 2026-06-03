import type { RegisteredProject } from '@ai-company/shared-types';

/**
 * Instance-layer project-registry seed. Mirrors
 * supabase/migrations/instance/0006_seed_project_registry.sql for this
 * company. The platform package `@ai-company/project-registry` never names
 * a project; it receives this builder via `registerInstanceRegistrySeed`
 * (called from apps/executive-dashboard/lib/platform.ts).
 *
 * To clone the platform for a different company:
 *   1. Edit the `defs`, `funnels`, and `connectors` records here to match
 *      that company's projects.
 *   2. Update instance-seed.ts and instance-connectors.ts to match.
 *   3. Update supabase/migrations/instance/* seeds to match.
 *
 * See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md and
 * docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md leak L8.
 */
export function buildInstanceRegistrySeed(): RegisteredProject[] {
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
    'foodtruck-il': {
      type: 'foodtruck-business',
      config: {
        adapter: 'foodtruck',
        revenueSource: 'foodtruck-supabase-events',
        reportingDays: 30,
        currency: 'ILS',
        avgTransactionValue: 329,
        monthlySubscriptionFee: 199,
      },
    },
    'lab-os': {
      type: 'mock-funnel',
      config: {
        revenueSource: 'mock-revenue',
        reportingDays: 30,
        currency: 'USD',
        totalRevenue: 4200,
        recurringRevenue: 2800,
        transactionCount: 14,
      },
    },
    'inventory-engine': {
      type: 'mock-funnel',
      config: {
        revenueSource: 'mock-revenue',
        reportingDays: 30,
        currency: 'USD',
        totalRevenue: 1850,
        recurringRevenue: 1200,
        transactionCount: 6,
      },
    },
    burgerstop: {
      type: 'mock-funnel',
      config: {
        revenueSource: 'mock-revenue',
        reportingDays: 30,
        currency: 'ILS',
        totalRevenue: 0,
        recurringRevenue: 0,
        transactionCount: 0,
      },
    },
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
