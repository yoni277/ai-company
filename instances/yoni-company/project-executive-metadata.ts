import type { ProjectExecutiveMetadata } from '@ai-company/shared-types';

/**
 * Instance-layer project metadata consumed by the platform executives
 * (COO vendor health, VP Marketing channel hints, etc.). Keyed by project
 * slug. The platform package never names a vendor or a channel — it asks
 * this map via `registerInstanceProjectMetadata()` in
 * @ai-company/ai-chief-of-staff/context.ts.
 *
 * Missing slugs return `undefined` and executives default to neutral output.
 *
 * To clone the platform for a different company:
 *   1. Replace the entries below with that company's vendor / channel data.
 *   2. Keep `instance-seed.ts`, `project-registry-seed.ts`, and this file
 *      in sync on project slugs.
 *
 * See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md leaks L2 + L3.
 */
const METADATA_BY_SLUG: Record<string, ProjectExecutiveMetadata> = {
  'foodtruck-il': {
    vendors: [
      { name: 'Wolt (delivery)' },
      { name: 'Supabase (data)' },
    ],
    marketingChannels: ['whatsapp', 'push', 'social', 'partnership'],
  },
};

export function getInstanceProjectMetadata(
  projectSlug: string,
): ProjectExecutiveMetadata | undefined {
  return METADATA_BY_SLUG[projectSlug];
}
