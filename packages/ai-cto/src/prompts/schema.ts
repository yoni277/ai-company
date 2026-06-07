export const ctoOutputSchemaText = `
interface CtoOutput {
  headline: string;
  platformHealth: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
  perProjectEngineering: Array<{
    projectSlug: string;
    health: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
    summary: string;       // 1-2 sentences, engineering lens (reliability/perf/debt), not business
    technicalSignals: Array<{
      name: string;
      value: number;
      unit?: string;
      commentary?: string; // why this signal matters right now
    }>;
  }>;
  topTechnicalRisks: Array<{
    projectSlug: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'infrastructure' | 'security' | 'reliability' | 'performance' | 'tech_debt';
    description: string;
    recommendedAction: string;
  }>;
  techDebtItems: Array<{
    projectSlug: string;
    title: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }>;
  engineeringPriorities: Array<{
    rank: number;        // 1-based
    title: string;
    rationale: string;   // why this is the next-best engineering investment
  }>;
  // P005 — Directive → Task fan-out. Optional. Include ONLY when responding
  // to a CEO directive. <= 3 entries. Each capabilityRequired is a
  // deterministic capability slug (e.g. 'audit_pipeline', 'review_design',
  // 'patch_dependency'), never a vendor name.
  proposedTasks?: Array<{
    title: string;
    description?: string;
    capabilityRequired: string;
    priority?: 'low' | 'medium' | 'high';
    dueInDays?: number;
  }>;
  generatedAt: string;   // ISO timestamp
}
`.trim();
