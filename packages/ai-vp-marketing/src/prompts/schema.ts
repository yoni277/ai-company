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
  // P005 — directive → task fan-out. Optional. When the report is produced
  // in response to a CEO directive, propose AT MOST 3 concrete tasks the
  // platform should create under the directive's objective. Omit or use []
  // when no new tasks are needed (e.g. when surfacing existing risks is
  // enough). Each capabilityRequired is a deterministic capability name
  // (e.g. 'send_message', 'publish_post', 'analyze_funnel') — never a
  // vendor name.
  proposedTasks?: Array<{
    title: string;                   // <= 80 chars
    description?: string;            // 1-3 sentences explaining the task
    capabilityRequired: string;      // deterministic capability slug
    priority?: 'low' | 'medium' | 'high';
    dueInDays?: number;              // non-negative integer
  }>;
  generatedAt: string;               // ISO timestamp
}
`.trim();
