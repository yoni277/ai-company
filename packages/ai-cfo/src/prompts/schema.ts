export const cfoOutputSchemaText = `
interface CfoOutput {
  headline: string;
  financialHealth: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
  cashSnapshot?: {
    estimatedRunwayMonths?: number;
    commentary: string;
  };
  perProjectFinancials: Array<{
    projectSlug: string;
    health: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
    summary: string;                  // 1-2 sentences, finance lens (revenue/cost/unit economics)
    revenueSignals: Array<{
      kind: 'revenue' | 'mrr' | 'arr' | 'cost' | 'unit_economic' | 'pipeline';
      name: string;
      value: number;
      unit?: string;
      commentary?: string;
    }>;
  }>;
  financialRisks: Array<{
    projectSlug: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'revenue' | 'cost' | 'cash' | 'unit_economics' | 'capital';
    description: string;
    recommendedAction: string;
  }>;
  capitalAllocations: Array<{
    projectSlug: string;
    action: 'invest' | 'maintain' | 'reduce' | 'monetize' | 'monitor';
    rationale: string;
    estimatedImpact: string;          // quantified where possible (e.g., "+$15k MRR / quarter")
  }>;
  financialPriorities: Array<{
    rank: number;                     // 1-based
    title: string;
    rationale: string;
  }>;
  // P005 — Directive → Task fan-out. Optional. Include ONLY when responding
  // to a CEO directive. <= 3 entries. Each capabilityRequired is a
  // deterministic capability slug (e.g. 'reconcile_ledger',
  // 'forecast_runway', 'audit_unit_economics'), never a vendor name.
  proposedTasks?: Array<{
    title: string;
    description?: string;
    capabilityRequired: string;
    priority?: 'low' | 'medium' | 'high';
    dueInDays?: number;
  }>;
  generatedAt: string;                // ISO timestamp
}
`.trim();
