import {
  auditPriorities,
  priorityRank,
  type PortfolioActionQueue,
  type PortfolioFinancialSnapshot,
  type PortfolioHealthSnapshot,
  type PortfolioIntelligenceSnapshot,
  type PortfolioPriority,
  type PortfolioRevenueSnapshot,
  type ProjectHealthSnapshot,
  type ProjectIntelligenceBundle,
  type RecommendedAction,
} from '@ai-company/shared-types';

const STATUS_RANK: Record<'healthy' | 'warning' | 'critical', number> = {
  critical: 0,
  warning: 1,
  healthy: 2,
};

// P1-3 — priority ranking goes through the shared validator (priorityRank),
// which is deterministic for every input (unknown → INVALID_PRIORITY_RANK, never
// the silent NaN a bare Record<Priority,number> lookup produced).

/**
 * Aggregate funnel and decision support across projects. No AI. No LLM.
 */
export function aggregatePortfolioIntelligence(
  bundles: ProjectIntelligenceBundle[],
  revenue?: PortfolioRevenueSnapshot | null,
  financial?: PortfolioFinancialSnapshot | null,
): PortfolioIntelligenceSnapshot {
  const projects = bundles.map(buildProjectHealthSnapshot);
  const priorities = rankProjects(projects);
  const health = buildPortfolioHealth(projects);
  const actionQueue = buildActionQueue(bundles);

  return {
    health,
    projects,
    priorities,
    actionQueue,
    revenue: revenue ?? null,
    financial: financial ?? null,
  };
}

/** CEO brief line — deterministic, no LLM. */
export function formatPortfolioSummary(
  snapshot: PortfolioIntelligenceSnapshot,
  options?: { topProjectBriefDetail?: string },
): string {
  const top = snapshot.priorities[0];
  if (!top) {
    return 'No portfolio projects configured for intelligence aggregation.';
  }

  const project = snapshot.projects.find((p) => p.projectId === top.projectId);
  const bn = project?.bottleneckLabel;
  const detail = options?.topProjectBriefDetail;

  let line = `${top.projectName} currently represents the highest priority project`;
  if (bn) line += ` due to a ${bn} bottleneck`;
  if (detail) line += bn ? ` and ${detail}` : ` due to ${detail}`;
  else if (!bn) line += ` (${top.reason})`;
  return `${line}.`;
}

function buildProjectHealthSnapshot(bundle: ProjectIntelligenceBundle): ProjectHealthSnapshot {
  const p1Count = bundle.decisionActions.filter((a) => a.priority === 'P1').length;
  return {
    projectId: bundle.projectId,
    projectName: bundle.projectName,
    funnelStatus: bundle.funnelStatus,
    bottleneckLabel: bundle.bottleneckLabel,
    openRecommendations: bundle.decisionActions.length,
    p1RecommendationCount: p1Count,
    priorityScore: projectPriorityScore(bundle, p1Count),
    live: bundle.live,
  };
}

function projectPriorityScore(bundle: ProjectIntelligenceBundle, p1Count: number): number {
  let score = 0;
  if (bundle.funnelStatus === 'critical') score += 100;
  else if (bundle.funnelStatus === 'warning') score += 50;
  score += p1Count * 30;
  score += bundle.decisionActions.filter((a) => a.priority === 'P2').length * 10;
  if (bundle.bottleneckRate !== null) score += Math.max(0, 100 - bundle.bottleneckRate);
  score += bundle.largestDropOffCount * 2;
  return Math.round(score);
}

function rankProjects(projects: ProjectHealthSnapshot[]): PortfolioPriority[] {
  const sorted = [...projects].sort(
    (a, b) => b.priorityScore - a.priorityScore || a.projectName.localeCompare(b.projectName),
  );
  return sorted.map((p, i) => ({
    rank: i + 1,
    projectId: p.projectId,
    projectName: p.projectName,
    priorityScore: p.priorityScore,
    reason: priorityReason(p),
  }));
}

function priorityReason(p: ProjectHealthSnapshot): string {
  const parts: string[] = [];
  if (p.funnelStatus === 'critical') parts.push('critical funnel health');
  else if (p.funnelStatus === 'warning') parts.push('warning funnel health');
  if (p.p1RecommendationCount > 0) {
    parts.push(`${p.p1RecommendationCount} P1 action${p.p1RecommendationCount === 1 ? '' : 's'}`);
  }
  if (p.bottleneckLabel) parts.push(`${p.bottleneckLabel} bottleneck`);
  if (parts.length === 0) return 'within normal operating thresholds';
  return parts.join('; ');
}

function buildPortfolioHealth(projects: ProjectHealthSnapshot[]): PortfolioHealthSnapshot {
  const criticalCount = projects.filter((p) => p.funnelStatus === 'critical').length;
  const warningCount = projects.filter((p) => p.funnelStatus === 'warning').length;
  const totalP1 = projects.reduce((n, p) => n + p.p1RecommendationCount, 0);

  let status: PortfolioHealthSnapshot['status'] = 'healthy';
  if (criticalCount > 0 || totalP1 >= 4) status = 'critical';
  else if (warningCount > 0 || totalP1 >= 2) status = 'warning';

  const avgScore =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, p) => sum + projectHealthScore(p), 0) / projects.length,
        )
      : 100;

  const sorted = [...projects].sort((a, b) => a.priorityScore - b.priorityScore);
  const healthiest = sorted[0];
  const needsAttention = sorted[sorted.length - 1];

  return {
    status,
    score: avgScore,
    projectCount: projects.length,
    healthiestProjectId: healthiest?.projectId ?? null,
    healthiestProjectName: healthiest?.projectName ?? null,
    needsAttentionProjectId:
      needsAttention && needsAttention.priorityScore > (healthiest?.priorityScore ?? 0)
        ? needsAttention.projectId
        : healthiest?.projectId ?? null,
    needsAttentionProjectName:
      needsAttention && needsAttention.priorityScore > (healthiest?.priorityScore ?? 0)
        ? needsAttention.projectName
        : healthiest?.projectName ?? null,
    generatedAt: new Date().toISOString(),
  };
}

function projectHealthScore(p: ProjectHealthSnapshot): number {
  const statusPoints = { healthy: 100, warning: 60, critical: 25 }[p.funnelStatus];
  const recPenalty = Math.min(40, p.openRecommendations * 5 + p.p1RecommendationCount * 10);
  return Math.max(0, statusPoints - recPenalty);
}

function buildActionQueue(bundles: ProjectIntelligenceBundle[]): PortfolioActionQueue {
  const actions = bundles
    .flatMap((b) => b.decisionActions)
    .sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) ||
        b.projectName.localeCompare(a.projectName) ||
        a.title.localeCompare(b.title),
    );

  // P1-3 — explicit validation + visible warning + audit trail for any invalid
  // priority encountered while ranking. No silent coercion; ranking above is
  // deterministic regardless (invalid sorts last via INVALID_PRIORITY_RANK).
  const priorityWarnings = auditPriorities(
    actions.map((a) => ({ priority: a.priority, label: `${a.projectName}:${a.title}` })),
  );

  const openCountByProject: Record<string, number> = {};
  for (const b of bundles) {
    openCountByProject[b.projectId] = b.decisionActions.length;
  }

  return {
    actions,
    openCountByProject,
    generatedAt: new Date().toISOString(),
    priorityWarnings,
  };
}

export function sortProjectsByHealth(
  projects: ProjectHealthSnapshot[],
): ProjectHealthSnapshot[] {
  return [...projects].sort(
    (a, b) =>
      STATUS_RANK[a.funnelStatus] - STATUS_RANK[b.funnelStatus] ||
      a.priorityScore - b.priorityScore,
  );
}
