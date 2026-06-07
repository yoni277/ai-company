import 'server-only';
import type { InMemorySeedProject } from '@ai-company/database';

/**
 * Project records seeded into the in-memory store when the dashboard runs in
 * `AI_COMPANY_DATA_MODE=mock`. This file is the **instance layer's** declaration
 * of "which projects exist in this company" — the platform package never sees it.
 *
 * To clone the platform for a different company:
 *   1. Edit this file with that company's slugs / names / statuses.
 *   2. Update `instance/connectors/*` to match.
 *   3. Update `supabase/migrations/instance/*` seeds to match.
 *
 * See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md and
 * docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md leak L6.
 */
export const INSTANCE_PROJECTS_SEED: InMemorySeedProject[] = [
  {
    slug: 'foodtruck-il',
    name: 'FoodTruck-IL',
    description: 'Israeli food truck operations platform.',
    status: 'healthy',
  },
];
