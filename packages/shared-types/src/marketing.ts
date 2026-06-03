import type { ProjectHealth } from './projects';
import type { RiskSeverity } from './risks';

export type MarketingFunnelStage =
  | 'awareness'
  | 'acquisition'
  | 'activation'
  | 'retention'
  | 'referral'
  | 'revenue';

export type MarketingChannel =
  | 'email'
  | 'push'
  | 'whatsapp'
  | 'social'
  | 'paid'
  | 'partnership'
  | 'organic'
  | 'product';

export type CampaignPriority = 'low' | 'medium' | 'high';
export type MetricTrend = 'up' | 'flat' | 'down' | 'unknown';

/**
 * The AI VP Marketing's structured output. Same CompanyContext input as Chief of Staff
 * and CTO; different interpretation — pirate-metrics funnel, channel-aware campaign ideas,
 * growth risks (churn / acquisition stall / unit-economics), and a ranked weekly priority list.
 */
export interface VpMarketingOutput {
  headline: string;
  marketingHealth: ProjectHealth;
  perProjectMarketing: Array<{
    projectSlug: string;
    health: ProjectHealth;
    summary: string;
    funnelMetrics: Array<{
      stage: MarketingFunnelStage;
      name: string;
      value: number;
      unit?: string;
      trend?: MetricTrend;
      commentary?: string;
    }>;
  }>;
  campaignIdeas: Array<{
    projectSlug: string;
    title: string;
    channel: MarketingChannel;
    priority: CampaignPriority;
    description: string;
    expectedImpact: string;
  }>;
  growthRisks: Array<{
    projectSlug: string;
    severity: RiskSeverity;
    description: string;
    recommendedAction: string;
  }>;
  marketingPriorities: Array<{
    rank: number;
    title: string;
    rationale: string;
  }>;
  generatedAt: string;
}
