import type { RegisteredProject } from '@ai-company/shared-types';

/**
 * Platform-side seed registry. This file is intentionally generic — it does
 * NOT name any company, project, slug, funnel stage, connector type, or
 * mock-revenue figure. Project-specific seed data lives in the instance
 * layer (e.g. instances/yoni-company/project-registry-seed.ts) and is
 * registered via `registerInstanceRegistrySeed`.
 *
 * Resolution order at runtime:
 *   1. Supabase (when AI_COMPANY_DATA_MODE=supabase and credentials are set)
 *   2. The registered instance-layer builder
 *   3. An empty array (no projects)
 *
 * See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md and
 * docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md leak L8.
 *
 * Do NOT re-introduce hardcoded `defs` / `funnels` / `connectors` /
 * `hasFoodTruckCredentials` in this file — that constituted leak L8 and was
 * the reason the platform could not be cloned for a different company.
 */

export type InstanceRegistrySeedBuilder = () => RegisteredProject[];

let registeredBuilder: InstanceRegistrySeedBuilder | null = null;

/**
 * Called once by the instance layer (at module load time, before the first
 * `loadProjects()` call) to inject the company-specific seed builder.
 * Idempotent: re-registering replaces the previous builder.
 */
export function registerInstanceRegistrySeed(
  builder: InstanceRegistrySeedBuilder,
): void {
  registeredBuilder = builder;
}

/** Test-only: clear the registered builder. */
export function __resetInstanceRegistrySeed(): void {
  registeredBuilder = null;
}

/**
 * Returns the in-memory seed produced by the registered instance builder, or
 * an empty array when no builder has been registered. Never throws and never
 * names a project.
 */
export function buildInMemoryRegistrySeed(): RegisteredProject[] {
  if (!registeredBuilder) return [];
  return registeredBuilder();
}
