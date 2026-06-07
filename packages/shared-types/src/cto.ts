import type { ProjectHealth } from './projects';
import type { RiskSeverity } from './risks';
import type { TaskProposal } from './doos';

export type TechnicalRiskCategory =
  | 'infrastructure'
  | 'security'
  | 'reliability'
  | 'performance'
  | 'tech_debt';

export type TechDebtImpact = 'low' | 'medium' | 'high';

/**
 * The AI CTO's structured output. Different shape from ChiefOfStaffOutput
 * because the CTO interprets the same CompanyContext through an engineering lens:
 * technical signals, debt, reliability — not business priorities.
 */
export interface CtoOutput {
  headline: string;
  platformHealth: ProjectHealth;
  perProjectEngineering: Array<{
    projectSlug: string;
    health: ProjectHealth;
    summary: string;
    technicalSignals: Array<{
      name: string;
      value: number;
      unit?: string;
      commentary?: string;
    }>;
  }>;
  topTechnicalRisks: Array<{
    projectSlug: string;
    severity: RiskSeverity;
    category: TechnicalRiskCategory;
    description: string;
    recommendedAction: string;
  }>;
  techDebtItems: Array<{
    projectSlug: string;
    title: string;
    impact: TechDebtImpact;
    description: string;
  }>;
  engineeringPriorities: Array<{
    rank: number;
    title: string;
    rationale: string;
  }>;
  /** P005 — see VpMarketingOutput.proposedTasks for semantics. */
  proposedTasks?: TaskProposal[];
  generatedAt: string;
}
