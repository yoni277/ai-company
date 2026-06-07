import type {
  CEODirective,
  CompanyContext,
  ProjectExecutiveMetadata,
} from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import { rollupCompanyHealth, hoursSince } from './analyzers/health';

/**
 * Optional inputs for {@link buildCompanyContext}. Both are produced by the
 * dashboard layer (it owns the directive table) and passed in here so that
 * the ai-chief-of-staff package stays unaware of dashboard internals.
 *
 * - activeDirectives: the full active directive list, so every executive can
 *   weigh them while forming priorities even on a normal daily briefing.
 * - focusDirective: the single directive that this run is specifically
 *   answering (directive fan-out). Setting this asks the executive to make
 *   it the primary topic of its output.
 */
export interface CompanyContextOptions {
  activeDirectives?: CEODirective[];
  focusDirective?: CEODirective;
}

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
export async function buildCompanyContext(
  repos: Repositories,
  options: CompanyContextOptions = {},
): Promise<CompanyContext> {
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
    ...(options.activeDirectives && options.activeDirectives.length > 0
      ? { activeDirectives: options.activeDirectives }
      : {}),
    ...(options.focusDirective ? { focusDirective: options.focusDirective } : {}),
  };
}
