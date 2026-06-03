import type {
  CompanyContext,
  ProjectExecutiveMetadata,
} from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import { rollupCompanyHealth, hoursSince } from './analyzers/health';

export type InstanceProjectMetadataProvider = (
  projectSlug: string,
) => ProjectExecutiveMetadata | undefined;

let metadataProvider: InstanceProjectMetadataProvider | null = null;

/**
 * Called once by the instance layer (at module-load time, before the first
 * `buildCompanyContext()` call) to inject the project-metadata provider.
 * Idempotent: re-registering replaces the previous provider.
 *
 * The platform never infers vendor/channel data from a project slug or name.
 * If no provider is registered, every project's `metadata` is `undefined`
 * and executives default to neutral generic language. See
 * GENERIC_PLATFORM_BOUNDARY.md leaks L2 + L3.
 */
export function registerInstanceProjectMetadata(
  provider: InstanceProjectMetadataProvider,
): void {
  metadataProvider = provider;
}

/** Test-only: clear the registered provider. */
export function __resetInstanceProjectMetadata(): void {
  metadataProvider = null;
}

/**
 * Build the cross-project context every executive consumes as input.
 *
 * Intentionally narrow: we only pull what an executive briefing needs.
 * Heavier analytics belong in dedicated analyzers later.
 */
export async function buildCompanyContext(repos: Repositories): Promise<CompanyContext> {
  const projects = await repos.projects.list();

  const perProject = await Promise.all(
    projects.map(async (project) => {
      const [latestMetrics, openRisks, openOpportunities, sources] = await Promise.all([
        repos.metrics.listLatestByProject(project.id, 1),
        repos.risks.listByProject(project.id, 'open'),
        repos.opportunities.listByProject(project.id),
        repos.dataSources.listByProject(project.id),
      ]);
      const lastSync = sources
        .map((s) => s.lastSync)
        .filter((x): x is string => !!x)
        .sort()
        .at(-1);
      const metadata = metadataProvider?.(project.slug);
      return {
        project,
        latestMetrics,
        openRisks,
        openOpportunities,
        freshnessHours: lastSync ? hoursSince(lastSync) : null,
        ...(metadata ? { metadata } : {}),
      };
    }),
  );

  const allOpenRisks = perProject.flatMap((p) => p.openRisks);
  const allOpps = perProject.flatMap((p) => p.openOpportunities);

  return {
    generatedAt: new Date().toISOString(),
    projects: perProject,
    rollup: {
      companyHealth: rollupCompanyHealth(perProject.map((p) => p.project.status)),
      openRiskCount: allOpenRisks.length,
      openOpportunityCount: allOpps.length,
    },
  };
}
