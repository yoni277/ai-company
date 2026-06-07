import type { ProjectHealth } from './projects';
import type { RiskSeverity } from './risks';
import type { TaskProposal } from './doos';

export type PipelineStage =
  | 'prospect'
  | 'qualified'
  | 'demo'
  | 'pilot'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export type DealStatus = 'open' | 'at_risk' | 'won' | 'lost';

/**
 * The AI VP Sales' structured output. Reads platform state through the pipeline:
 * stage distribution, deal velocity, named accounts, forecast vs target. Advisory only —
 * never sends outreach, signs contracts, or modifies CRM records.
 */
export interface VpSalesOutput {
  headline: string;
  salesHealth: ProjectHealth;
  /** Quota progress when context supports it. Optional pre-Phase-2 (no CRM connector yet). */
  forecastSummary?: {
    quotaProgress?: number; // 0..1 ratio
    commentary: string;
  };
  perProjectSales: Array<{
    projectSlug: string;
    health: ProjectHealth;
    summary: string;
    pipelineMetrics: Array<{
      stage: PipelineStage;
      name: string;
      value: number;
      unit?: string;
      commentary?: string;
    }>;
  }>;
  deals: Array<{
    projectSlug: string;
    title: string;
    status: DealStatus;
    estimatedValue?: number;
    estimatedValueUnit?: string;
    nextAction: string;
  }>;
  salesRisks: Array<{
    projectSlug: string;
    severity: RiskSeverity;
    description: string;
    recommendedAction: string;
  }>;
  salesPriorities: Array<{
    rank: number;
    title: string;
    rationale: string;
  }>;
  /** P005 — see VpMarketingOutput.proposedTasks for semantics. */
  proposedTasks?: TaskProposal[];
  generatedAt: string;
}
