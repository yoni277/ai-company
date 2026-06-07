import type { ProjectHealth } from './projects';
import type { RiskSeverity } from './risks';
import type { OpportunityPriority } from './opportunities';
import type { TaskProposal } from './doos';

export type ReportType = 'daily_briefing' | 'weekly_report' | 'ad_hoc';

export interface ExecutiveReport<TBody = unknown> {
  id: string;
  executiveId: string;
  reportType: ReportType;
  summary: string;
  body: TBody;
  createdAt: string;
  /**
   * Set when this report was produced as an ad-hoc response to a CEO
   * directive (directive fan-out). Null for normal daily/weekly briefings.
   */
  sourceDirectiveId: string | null;
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
  /**
   * P005 — Optional proposals for new Tasks the executive thinks should be
   * created under the active objective. Subject to the generic transformer
   * gate (cap, missing-objective skip). Absent on reports produced before
   * the fan-out was wired or where the executive proposed nothing.
   */
  proposedTasks?: TaskProposal[];
  generatedAt: string;
}
