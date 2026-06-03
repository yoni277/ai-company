import type { HealthScore, HealthScoreInputs } from '@ai-company/shared-types';

/**
 * Deterministic company health score. No AI, no LLM.
 *
 * score = 100 - 5×criticalIssues - 3×failedDeployments - 1×highPriorityIssues
 * bounded to [0, 100]
 */
export function calculateHealthScore(inputs: HealthScoreInputs): HealthScore {
  const raw =
    100 -
    5 * Math.max(0, inputs.criticalIssues) -
    3 * Math.max(0, inputs.failedDeployments) -
    1 * Math.max(0, inputs.highPriorityIssues);

  const score = Math.min(100, Math.max(0, Math.round(raw)));
  const level: HealthScore['level'] =
    score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red';

  return { score, level };
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
