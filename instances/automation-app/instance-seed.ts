import 'server-only';
import type { InMemorySeedProject } from '@ai-company/database';

/**
 * Project records seeded into the in-memory store when the dashboard runs in
 * `AI_COMPANY_DATA_MODE=mock`. This file is the **instance layer's** declaration
 * of "which projects exist in this company" — the platform package never sees it.
 *
 * automation-app is a pre-product instance: one project, the Automation App
 * marketplace. No live connectors yet (Phase 1 scaffold). The platform stays
 * generic; everything company-specific lives in this directory.
 *
 * See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md and
 * docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md leak L6.
 */
export const INSTANCE_PROJECTS_SEED: InMemorySeedProject[] = [
  {
    slug: 'automation-app',
    name: 'Automation App',
    description:
      'Consumer automation marketplace — open the app, choose an automation, pay via in-app purchase, connect your accounts, run it, get a result.',
    status: 'healthy',
  },
];
