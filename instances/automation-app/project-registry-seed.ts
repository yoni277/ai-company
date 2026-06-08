import type { RegisteredProject } from '@ai-company/shared-types';

/**
 * Instance-layer project-registry seed for the automation-app instance.
 * The platform package `@ai-company/project-registry` never names a project;
 * it receives this builder via `registerInstanceRegistrySeed` (called from
 * apps/executive-dashboard/lib/platform.ts).
 *
 * automation-app is PRE-PRODUCT: the single project ships with NO live
 * connector. Its connector type (`marketplace-prelaunch`) has no resolver
 * registered in instance-resolvers.ts, so portfolio-intelligence + revenue
 * fall back to the proven generic mock path. The funnel below describes the
 * marketplace journey (open → choose → pay → connect → run → result) and its
 * counts are illustrative mock data for the mock-mode dashboard only.
 *
 * To clone for a different company: edit the defs/funnels/connectors records.
 *
 * See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md and
 * docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md leak L8.
 */
export function buildInstanceRegistrySeed(): RegisteredProject[] {
  const defs = [
    {
      id: 'seed-automation-app',
      slug: 'automation-app',
      name: 'Automation App',
      description:
        'Consumer automation marketplace — open, choose, pay (IAP), connect, run, result.',
      status: 'active' as const,
      enabled: true,
      sortOrder: 10,
    },
  ];

  const funnels: Record<string, { stages: Array<{ id: string; label: string; order: number; mock: number }> }> = {
    'automation-app': {
      stages: [
        { id: 'opened', label: 'Opened app', order: 0, mock: 100 },
        { id: 'chose', label: 'Chose automation', order: 1, mock: 64 },
        { id: 'paid', label: 'Paid (IAP)', order: 2, mock: 22 },
        { id: 'connected', label: 'Connected accounts', order: 3, mock: 18 },
        { id: 'ran', label: 'Ran automation', order: 4, mock: 15 },
        { id: 'result', label: 'Got result', order: 5, mock: 14 },
      ],
    },
  };

  const connectors: Record<string, { type: string; config: Record<string, unknown> }> = {
    'automation-app': {
      // Pre-launch placeholder type. No resolver registered → generic mock
      // fallback in connector-portfolio-intelligence / connector-revenue.
      type: 'marketplace-prelaunch',
      config: {
        revenueSource: 'mock-revenue',
        monetization: 'in-app-purchase',
        currency: 'USD',
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
        // Pre-product: no live backend exists yet.
        liveCapable: false,
        config: c.config,
      },
    };
  });
}
