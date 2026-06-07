export const vpSalesOutputSchemaText = `
interface VpSalesOutput {
  headline: string;
  salesHealth: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
  forecastSummary?: {
    quotaProgress?: number;          // 0..1 ratio
    commentary: string;
  };
  perProjectSales: Array<{
    projectSlug: string;
    health: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
    summary: string;                  // 1-2 sentences, sales lens
    pipelineMetrics: Array<{
      stage: 'prospect' | 'qualified' | 'demo' | 'pilot' | 'negotiation' | 'closed_won' | 'closed_lost';
      name: string;
      value: number;
      unit?: string;
      commentary?: string;
    }>;
  }>;
  deals: Array<{
    projectSlug: string;
    title: string;
    status: 'open' | 'at_risk' | 'won' | 'lost';
    estimatedValue?: number;
    estimatedValueUnit?: string;
    nextAction: string;
  }>;
  salesRisks: Array<{
    projectSlug: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendedAction: string;
  }>;
  salesPriorities: Array<{
    rank: number;                     // 1-based
    title: string;
    rationale: string;
  }>;
  // P005 — Directive → Task fan-out. Optional. Include ONLY when responding
  // to a CEO directive. <= 3 entries. Each capabilityRequired is a
  // deterministic capability slug (e.g. 'follow_up_deal',
  // 'qualify_prospect', 'send_proposal'), never a vendor name.
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
