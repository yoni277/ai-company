import type { Project, ProjectHealth } from './projects';
import type { ProjectMetric } from './metrics';
import type { Risk } from './risks';
import type { Opportunity } from './opportunities';
import type { ReportType } from './reports';

/**
 * Cross-project, normalized view that every executive consumes as input.
 *
 * Build only via packages/ai-chief-of-staff/context.ts so the LLM input
 * surface stays uniform across executive roles.
 */
export interface CompanyContext {
  generatedAt: string;
  projects: Array<{
    project: Project;
    latestMetrics: ProjectMetric[];
    openRisks: Risk[];
    openOpportunities: Opportunity[];
    freshnessHours: number | null;
  }>;
  rollup: {
    companyHealth: ProjectHealth;
    openRiskCount: number;
    openOpportunityCount: number;
  };
}

export interface Executive<TOutput = unknown> {
  readonly id: string;
  readonly displayName: string;
  readonly reportTypes: ReportType[];
  generateReport(ctx: CompanyContext, reportType: ReportType): Promise<TOutput>;
}
