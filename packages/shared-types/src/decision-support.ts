/** CEO-reviewed recommendation — no autonomous execution. */
export interface RecommendedAction {
  id: string;
  projectId: string;
  projectName: string;
  priority: 'P1' | 'P2' | 'P3';
  category: 'marketing' | 'sales' | 'operations' | 'product';
  title: string;
  reason: string;
  expectedImpact: string;
  source: 'funnel-engine' | 'health-score' | 'manual';
  requiresApproval: boolean;
}

/** Deterministic recommendations for one portfolio project. */
export interface DecisionSupportResult {
  projectId: string;
  projectName: string;
  actions: RecommendedAction[];
  generatedAt: string;
  /** P1-1 — algorithm identity@version. Always set by generateDecisionSupport. */
  scoringVersion?: string;
  /** P1-1 — digest of the decision thresholds; auto-bumps when one changes. */
  policyVersion?: string;
}
