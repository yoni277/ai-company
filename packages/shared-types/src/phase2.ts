import type { Risk } from './risks';
import type { FoodTruckBusinessMetrics } from './business';

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
}

export interface DailyBriefMetricsInput {
  github: GithubMetrics;
  supabase: SupabaseMetrics;
  health: HealthScore;
  pendingApprovalCount: number;
  foodTruck?: FoodTruckBusinessMetrics;
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
