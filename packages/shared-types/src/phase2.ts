import type { Risk } from './risks';
import type { FoodTruckBusinessMetrics } from './business';
import type { FunnelSnapshot } from './funnel';
import type { DecisionSupportResult } from './decision-support';
import type { PortfolioIntelligenceSnapshot } from './project-intelligence';
import type { PortfolioFinancialSnapshot } from './financial';
import type { RevenueSnapshot } from './revenue';

/** GitHub connector v1 — raw collection only. */
export interface GithubMetrics {
  openIssues: number;
  openPullRequests: number;
  commitsLast7Days: number;
  repositoryName: string;
}

/** Supabase platform connector v1 — read-only aggregates. */
export interface SupabaseMetrics {
  userCount: number;
  recentActivityCount: number;
  databaseHealthy: boolean;
  transactionCount: number;
}

/** Deterministic company health (no LLM). */
export interface HealthScore {
  score: number;
  level: 'green' | 'yellow' | 'red';
}

export interface HealthScoreInputs {
  criticalIssues: number;
  failedDeployments: number;
  highPriorityIssues: number;
}

/** Daily CEO brief — AI explains pre-computed metrics only. */
export interface DailyBrief {
  companyHealth: string;
  topRisks: string[];
  opportunities: string[];
  approvalsWaiting: string[];
  /** Phase 3A — deterministic owner funnel summary. */
  ownerAcquisitionSummary: string;
  /** Phase 3B — deterministic generic funnel summaries per project. */
  funnelSummaries: string[];
  /** Phase 3C — deterministic recommended actions (CEO approval required). */
  recommendedActions: string[];
  /** Phase 4A — deterministic portfolio priority summary. */
  portfolioSummary: string;
  /** Phase 5A — deterministic revenue visibility (no recommendations). */
  revenueSummaries: string[];
  /** Phase 5B — deterministic financial overview (no recommendations). */
  financialOverviews: string[];
}

export interface DailyBriefMetricsInput {
  github: GithubMetrics;
  supabase: SupabaseMetrics;
  health: HealthScore;
  pendingApprovalCount: number;
  foodTruck?: FoodTruckBusinessMetrics;
  /** Phase 3B — pre-computed funnel snapshots (engine output). */
  funnels?: FunnelSnapshot[];
  /** Phase 3C — pre-computed decision support (engine + adapters). */
  decisionSupport?: DecisionSupportResult[];
  /** Phase 4A — aggregated multi-project intelligence. */
  portfolio?: PortfolioIntelligenceSnapshot;
  /** Phase 4A — top-project brief detail from adapter. */
  portfolioTopProjectBriefDetail?: string;
  /** Phase 5A — pre-computed revenue snapshots. */
  revenueSnapshots?: RevenueSnapshot[];
  /** Phase 5B — portfolio financial intelligence (from revenue snapshots). */
  portfolioFinancial?: PortfolioFinancialSnapshot;
}

export interface PendingApproval {
  id: string;
  label: string;
  source: string;
  projectName?: string;
}

export interface Phase2Snapshot {
  github: GithubMetrics;
  supabase: SupabaseMetrics;
  health: HealthScore;
  topRisks: Risk[];
  pendingApprovals: PendingApproval[];
  githubLive: boolean;
  supabaseLive: boolean;
}
