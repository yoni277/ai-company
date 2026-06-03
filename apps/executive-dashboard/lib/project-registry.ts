import 'server-only';
import { projectRegistryFromEnv } from '@ai-company/project-registry';
import type {
  FunnelHealth,
  PortfolioIntelligenceSnapshot,
  RegisteredProject,
} from '@ai-company/shared-types';

export interface ProjectRegistryViewRow {
  project: RegisteredProject;
  funnelHealth: FunnelHealth['status'] | null;
  bottleneck: string | null;
  openRecommendations: number;
}

export async function loadProjectRegistryView(
  portfolio?: PortfolioIntelligenceSnapshot,
): Promise<{
  projects: ProjectRegistryViewRow[];
  validation: Awaited<ReturnType<ReturnType<typeof projectRegistryFromEnv>['loadAndValidate']>>['validation'];
  source: 'database' | 'in-memory';
}> {
  const { projects, validation, source } = await projectRegistryFromEnv().loadAndValidate();

  const healthBySlug = new Map(
    (portfolio?.projects ?? []).map((p) => [
      p.projectId,
      { status: p.funnelStatus, bottleneck: p.bottleneckLabel, open: p.openRecommendations },
    ]),
  );

  const rows: ProjectRegistryViewRow[] = projects.map((project) => {
    const h = healthBySlug.get(project.definition.slug);
    return {
      project,
      funnelHealth: h?.status ?? null,
      bottleneck: h?.bottleneck ?? null,
      openRecommendations: h?.open ?? 0,
    };
  });

  return { projects: rows, validation, source };
}
