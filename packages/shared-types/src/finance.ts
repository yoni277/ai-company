import type { ProjectHealth } from './projects';
import type { RiskSeverity } from './risks';

export type RevenueSignalKind =
  | 'revenue'
  | 'mrr'
  | 'arr'
  | 'cost'
  | 'unit_economic'
  | 'pipeline';

export type FinancialRiskCategory =
  | 'revenue'
  | 'cost'
  | 'cash'
  | 'unit_economics'
  | 'capital';

export type CapitalAction = 'invest' | 'maintain' | 'reduce' | 'monetize' | 'monitor';

/**
 * The AI CFO's structured output. Same CompanyContext input as the others; interpreted
 * as cash, revenue, unit economics, and capital-allocation signals. Recommendations are
 * advisory only — the CFO never moves money or commits spend.
 */
export interface CfoOutput {
  headline: string;
  financialHealth: ProjectHealth;
  /** Company-level cash read. Optional because pre-Phase-2 we don't have cash data ingested yet. */
  cashSnapshot?: {
    estimatedRunwayMonths?: number;
    commentary: string;
  };
  perProjectFinancials: Array<{
    projectSlug: string;
    health: ProjectHealth;
    summary: string;
    revenueSignals: Array<{
      kind: RevenueSignalKind;
      name: string;
      value: number;
      unit?: string;
      commentary?: string;
    }>;
  }>;
  financialRisks: Array<{
    projectSlug: string;
    severity: RiskSeverity;
    category: FinancialRiskCategory;
    description: string;
    recommendedAction: string;
  }>;
  capitalAllocations: Array<{
    projectSlug: string;
    action: CapitalAction;
    rationale: string;
    estimatedImpact: string;
  }>;
  financialPriorities: Array<{
    rank: number;
    title: string;
    rationale: string;
  }>;
  generatedAt: string;
}
