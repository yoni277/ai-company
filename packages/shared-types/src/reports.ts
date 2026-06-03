import type { ProjectHealth } from './projects.js';
import type { RiskSeverity } from './risks.js';
import type { OpportunityPriority } from './opportunities.js';

export type ReportType = 'daily_briefing' | 'weekly_report' | 'ad_hoc';

export interface ExecutiveReport<TBody = unknown> {
  id: string;
  executiveId: string;
  reportType: ReportType;
  summary: string;
  body: TBody;
  createdAt: string;
}

/** The structured output the AI Chief of Staff returns and persists into reports.body. */
export interface ChiefOfStaffOutput {
  headline: string;
  companyHealth: ProjectHealth;
  perProject: Array<{
    projectSlug: string;
    health: ProjectHealth;
    summary: string;
    keyMetrics: Array<{ name: string; value: number; unit?: string }>;
  }>;
  topRisks: Array<{
    projectSlug: string;
    severity: RiskSeverity;
    description: string;
    recommendedAction: string;
  }>;
  topOpportunities: Array<{
    projectSlug: string;
    priority: OpportunityPriority;
    description: string;
    recommendedAction: string;
  }>;
  ceoPriorities: Array<{
    rank: number;
    title: string;
    rationale: string;
  }>;
  generatedAt: string;
}
