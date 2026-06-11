import { buildScoringMeta, type HealthScore, type HealthScoreInputs } from '@ai-company/shared-types';

/**
 * P1-1 — named scoring weights/thresholds. The formula reads these (not inline
 * literals), and `policyVersion` derives from them, so changing a weight bumps
 * the version AND the math in lockstep. (Extraction to instance config is P1-2;
 * here they are only named.)
 */
const POLICY = {
  criticalIssueWeight: 5,
  failedDeploymentWeight: 3,
  highPriorityIssueWeight: 1,
  base: 100,
  greenThreshold: 80,
  yellowThreshold: 50,
} as const;

/** Bump only when the algorithm/formula itself changes (not on a weight tweak). */
const ALGORITHM_VERSION = 1;
export const HEALTH_SCORE_SCORING_META = buildScoringMeta('health-score', ALGORITHM_VERSION, POLICY);

/**
 * Deterministic company health score. No AI, no LLM.
 *
 * score = base - criticalIssueWeight×criticalIssues - failedDeploymentWeight×failedDeployments
 *              - highPriorityIssueWeight×highPriorityIssues   (bounded to [0, 100])
 */
export function calculateHealthScore(inputs: HealthScoreInputs): HealthScore {
  const raw =
    POLICY.base -
    POLICY.criticalIssueWeight * Math.max(0, inputs.criticalIssues) -
    POLICY.failedDeploymentWeight * Math.max(0, inputs.failedDeployments) -
    POLICY.highPriorityIssueWeight * Math.max(0, inputs.highPriorityIssues);

  const score = Math.min(100, Math.max(0, Math.round(raw)));
  const level: HealthScore['level'] =
    score >= POLICY.greenThreshold ? 'green' : score >= POLICY.yellowThreshold ? 'yellow' : 'red';

  return { score, level, ...HEALTH_SCORE_SCORING_META };
}

export function healthScoreInputsFromMetrics(params: {
  githubOpenIssues: number;
  criticalRisks: number;
  failedDeployments?: number;
}): HealthScoreInputs {
  return {
    criticalIssues: params.criticalRisks,
    failedDeployments: params.failedDeployments ?? failedDeploymentsFromEnv(),
    highPriorityIssues: params.githubOpenIssues,
  };
}

function failedDeploymentsFromEnv(): number {
  const n = Number(process.env.FAILED_DEPLOYMENTS_COUNT ?? '0');
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
