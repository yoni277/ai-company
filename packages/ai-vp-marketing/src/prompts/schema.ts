export const vpMarketingOutputSchemaText = `
interface VpMarketingOutput {
  headline: string;
  marketingHealth: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
  perProjectMarketing: Array<{
    projectSlug: string;
    health: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
    summary: string;                  // 1-2 sentences, growth lens (funnel/engagement/CAC)
    funnelMetrics: Array<{
      stage: 'awareness' | 'acquisition' | 'activation' | 'retention' | 'referral' | 'revenue';
      name: string;
      value: number;
      unit?: string;
      trend?: 'up' | 'flat' | 'down' | 'unknown';
      commentary?: string;
    }>;
  }>;
  campaignIdeas: Array<{
    projectSlug: string;
    title: string;
    channel: 'email' | 'push' | 'whatsapp' | 'social' | 'paid' | 'partnership' | 'organic' | 'product';
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImpact: string;          // quantified where possible (e.g., "+12% activation")
  }>;
  growthRisks: Array<{
    projectSlug: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendedAction: string;
  }>;
  marketingPriorities: Array<{
    rank: number;                    // 1-based
    title: string;
    rationale: string;
  }>;
  generatedAt: string;               // ISO timestamp
}
`.trim();
