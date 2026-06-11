import type { Risk } from './risks';
import type { ProvenanceBand } from './provenance';
import type { FunnelSnapshot } from './funnel';
import type { DecisionSupportResult } from './decision-support';
import type { PortfolioIntelligenceSnapshot } from './project-intelligence';
import type { PortfolioFinancialSnapshot } from './financial';
import type { CEODecision, CEODirective } from './ceo-operating-system';
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
  /** P1-1 — algorithm identity@version. Always set by calculateHealthScore. */
  scoringVersion?: string;
  /** P1-1 — digest of the scoring weights; auto-bumps when a weight changes. */
  policyVersion?: string;
}

/**
 * Generic acquisition-funnel summary produced by an instance-layer adapter
 * (any "register new producers" / onboarding pipeline). Passed into the Chief
 * of Staff so it can render and explain the numbers without knowing what the
 * underlying business actually is.
 *
 * Both fields are required when the field is present — `promptLine` is the
 * compact fact-packed line fed into the LLM, `fallbackSummary` is the
 * deterministic string used when the LLM is unavailable or returns garbage.
 */
export interface AcquisitionSummary {
  /** Compact, fact-packed line used inside the LLM prompt. */
  promptLine: string;
  /** Human-readable summary used as the deterministic fallback. */
  fallbackSummary: string;
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
  /** Phase 5C.1 — active CEO directives (no LLM). */
  ceoDirectives: string[];
  /** Phase 5C.1 — approved / in-progress CEO decisions. */
  openCeoDecisions: string[];
}

export interface DailyBriefMetricsInput {
  github: GithubMetrics;
  supabase: SupabaseMetrics;
  health: HealthScore;
  pendingApprovalCount: number;
  /**
   * Generic acquisition summary supplied by the instance layer. The Chief of
   * Staff reads only this field; it never knows what kind of acquisition
   * funnel produced the strings.
   */
  acquisitionSummary?: AcquisitionSummary;
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
  /** Phase 5C.1 — CEO operating system records. */
  ceoDirectives?: CEODirective[];
  ceoDecisions?: CEODecision[];
}

export interface PendingApproval {
  id: string;
  label: string;
  source: string;
  projectName?: string;
}

/**
 * D6 — a risk decorated with its provenance band. `advisory: true` means the
 * risk is CEO-visible but did NOT move the deterministic health score
 * (executive/unknown provenance, not confirmed). `confirmed: true` means an
 * advisory risk was promoted into scoring via a ceo_decisions record.
 */
export interface ProvenanceRisk extends Risk {
  band: ProvenanceBand;
  advisory: boolean;
  confirmed: boolean;
}

export interface Phase2Snapshot {
  github: GithubMetrics;
  supabase: SupabaseMetrics;
  health: HealthScore;
  topRisks: ProvenanceRisk[];
  pendingApprovals: PendingApproval[];
  githubLive: boolean;
  supabaseLive: boolean;
}
