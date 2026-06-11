import type { RecommendedAction } from './decision-support';
import type { FunnelHealth } from './funnel';
import type { PortfolioFinancialSnapshot } from './financial';
import type { PortfolioRevenueSnapshot } from './revenue';

/** Per-project rollup for portfolio views. */
export interface ProjectHealthSnapshot {
  projectId: string;
  projectName: string;
  funnelStatus: FunnelHealth['status'];
  bottleneckLabel: string | null;
  openRecommendations: number;
  p1RecommendationCount: number;
  priorityScore: number;
  live: boolean;
}

/** Portfolio-wide health (deterministic). */
export interface PortfolioHealthSnapshot {
  status: FunnelHealth['status'];
  /** 0–100 aggregate score (higher is healthier). */
  score: number;
  projectCount: number;
  healthiestProjectId: string | null;
  healthiestProjectName: string | null;
  needsAttentionProjectId: string | null;
  needsAttentionProjectName: string | null;
  generatedAt: string;
}

/** Ranked project priority for CEO focus. */
export interface PortfolioPriority {
  rank: number;
  projectId: string;
  projectName: string;
  priorityScore: number;
  reason: string;
}

/** Cross-project recommended actions. */
export interface PortfolioActionQueue {
  actions: RecommendedAction[];
  openCountByProject: Record<string, number>;
  generatedAt: string;
  /**
   * P1-3 — audit trail of invalid priorities encountered at the ranking
   * boundary (each also emits a visible warning). Empty when every action
   * carried a known priority. Never silently dropped.
   */
  priorityWarnings: string[];
}

/** Full portfolio intelligence output. */
export interface PortfolioIntelligenceSnapshot {
  health: PortfolioHealthSnapshot;
  projects: ProjectHealthSnapshot[];
  priorities: PortfolioPriority[];
  actionQueue: PortfolioActionQueue;
  /** Phase 5A — revenue visibility (does not affect priority ranking). */
  revenue: PortfolioRevenueSnapshot | null;
  /** Phase 5B — normalized financial intelligence (does not affect priority ranking). */
  financial: PortfolioFinancialSnapshot | null;
}

/** Input bundle per project before aggregation. */
export interface ProjectIntelligenceBundle {
  projectId: string;
  projectName: string;
  live: boolean;
  funnelStatus: FunnelHealth['status'];
  bottleneckLabel: string | null;
  bottleneckRate: number | null;
  largestDropOffCount: number;
  decisionActions: RecommendedAction[];
  /** Optional adapter line for portfolio CEO brief (project-specific wording). */
  briefDetail?: string;
}
