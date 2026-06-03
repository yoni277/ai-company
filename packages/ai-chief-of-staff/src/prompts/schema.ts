export const chiefOfStaffOutputSchemaText = `
interface ChiefOfStaffOutput {
  headline: string;
  companyHealth: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
  perProject: Array<{
    projectSlug: string;
    health: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
    summary: string;
    keyMetrics: Array<{ name: string; value: number; unit?: string }>;
  }>;
  topRisks: Array<{
    projectSlug: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendedAction: string;
  }>;
  topOpportunities: Array<{
    projectSlug: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    recommendedAction: string;
  }>;
  ceoPriorities: Array<{
    rank: number;
    title: string;
    rationale: string;
  }>;
  generatedAt: string; // ISO timestamp
}
`.trim();
