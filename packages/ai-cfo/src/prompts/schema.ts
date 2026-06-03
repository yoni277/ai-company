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
  generatedAt: string;                // ISO timestamp
}
`.trim();
