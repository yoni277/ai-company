import {
  auditPriorities,
  buildScoringMeta,
  priorityRank,
  type DecisionSupportResult,
  type FunnelDropOff,
  type FunnelSnapshot,
  type RecommendedAction,
} from '@ai-company/shared-types';

// P1-3 — priority ranking goes through the shared validator (priorityRank):
// deterministic for every input (unknown → INVALID_PRIORITY_RANK, never a silent
// NaN), with an explicit warning + audit for any invalid priority.

/**
 * P1-1 — named decision thresholds. The recommendation rules read these (not
 * inline literals), and `policyVersion` derives from them, so a threshold change
 * bumps the version AND the rule together. (Config extraction is P1-2.)
 */
const POLICY = {
  bottleneckRateThreshold: 50,
  dropOffMinThreshold: 5,
  dropOffHighThreshold: 10,
  topOfFunnelMinThreshold: 5,
} as const;

const ALGORITHM_VERSION = 1;
export const DECISION_SUPPORT_SCORING_META = buildScoringMeta(
  'decision-support',
  ALGORITHM_VERSION,
  POLICY,
);

/**
 * Deterministic decision support from funnel intelligence. No AI. No LLM.
 * No side effects. No external calls. Recommendations only.
 */
export function generateDecisionSupport(snapshot: FunnelSnapshot): DecisionSupportResult {
  const actions: RecommendedAction[] = [];
  const { health } = snapshot;
  const first = firstStage(snapshot);

  if (health.status === 'critical') {
    actions.push(
      baseAction(snapshot, {
        id: 'funnel-health-critical',
        priority: 'P1',
        category: 'operations',
        title: 'Review funnel health immediately',
        reason: `Funnel health is critical (worst adjacent conversion below 30%).`,
        expectedImpact: 'Stabilize funnel performance before further drop-off.',
      }),
    );
  }

  const bn = health.mainBottleneck;
  if (bn && bn.rate < POLICY.bottleneckRateThreshold) {
    actions.push(
      baseAction(snapshot, {
        id: `bottleneck-${bn.fromStageId}-${bn.toStageId}`,
        priority: 'P1',
        category: 'product',
        title: 'Investigate funnel bottleneck',
        reason: `${bn.fromLabel} → ${bn.toLabel} conversion is ${bn.rate}% (below 50% target). ${bn.toCount} of ${bn.fromCount} advanced.`,
        expectedImpact: `Improve conversion from ${bn.fromLabel} to ${bn.toLabel}.`,
      }),
    );
  }

  const worstDropOff = largestDropOff(health.dropOffs);
  if (worstDropOff && worstDropOff.lostCount > POLICY.dropOffMinThreshold) {
    const priority: RecommendedAction['priority'] =
      worstDropOff.lostCount > POLICY.dropOffHighThreshold ? 'P1' : 'P2';
    actions.push(
      baseAction(snapshot, {
        id: `dropoff-${worstDropOff.fromStageId}-${worstDropOff.toStageId}`,
        priority,
        category: 'sales',
        title: 'Recover lost users/customers from stage drop-off',
        reason: `${worstDropOff.lostCount} did not advance from ${worstDropOff.fromLabel} to ${worstDropOff.toLabel} (${worstDropOff.dropOffRate}% drop-off).`,
        expectedImpact: `Recover volume between ${worstDropOff.fromLabel} and ${worstDropOff.toLabel}.`,
      }),
    );
  }

  if (first && first.count < POLICY.topOfFunnelMinThreshold) {
    actions.push(
      baseAction(snapshot, {
        id: 'top-of-funnel-low',
        priority: 'P2',
        category: 'marketing',
        title: 'Increase top-of-funnel acquisition',
        reason: `Only ${first.count} at ${first.label} — below minimum growth threshold (5).`,
        expectedImpact: `Grow ${first.label} stage volume to sustain the funnel.`,
      }),
    );
  }

  return {
    projectId: snapshot.projectId,
    projectName: snapshot.projectName,
    actions: sortActions(dedupeById(actions)),
    generatedAt: new Date().toISOString(),
    ...DECISION_SUPPORT_SCORING_META,
  };
}

/** Numbered lines for the daily CEO brief — deterministic, no LLM. */
export function formatRecommendedActionsBrief(
  results: DecisionSupportResult[],
): string[] {
  const flat = results.flatMap((r) => r.actions);
  const sorted = sortActions(flat);
  if (sorted.length === 0) {
    return ['No recommended actions today — funnel within normal thresholds.'];
  }
  return sorted.map(
    (a, i) =>
      `${i + 1}. ${a.title}. ${a.reason} Expected impact: ${a.expectedImpact}`,
  );
}

export function sortActions(actions: RecommendedAction[]): RecommendedAction[] {
  // P1-3 — surface any invalid priority explicitly (visible warning + audit)
  // before ranking. The sort below is deterministic for all inputs (no NaN).
  auditPriorities(actions.map((a) => ({ priority: a.priority, label: a.title })));
  return [...actions].sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      a.projectName.localeCompare(b.projectName) ||
      a.title.localeCompare(b.title),
  );
}

function baseAction(
  snapshot: FunnelSnapshot,
  fields: Omit<RecommendedAction, 'id' | 'projectId' | 'projectName' | 'source' | 'requiresApproval'> & {
    id: string;
  },
): RecommendedAction {
  const { id, ...rest } = fields;
  return {
    ...rest,
    id: `${snapshot.projectId}-${id}`,
    projectId: snapshot.projectId,
    projectName: snapshot.projectName,
    source: 'funnel-engine',
    requiresApproval: true,
  };
}

function firstStage(snapshot: FunnelSnapshot): { label: string; count: number } | null {
  const ordered = [...snapshot.stages].sort((a, b) => a.order - b.order);
  const stage = ordered[0];
  if (!stage) return null;
  const metric = snapshot.metrics.find((m) => m.stageId === stage.id);
  return { label: stage.label, count: metric?.count ?? 0 };
}

function largestDropOff(dropOffs: FunnelDropOff[]): FunnelDropOff | null {
  if (dropOffs.length === 0) return null;
  return [...dropOffs].sort((a, b) => b.lostCount - a.lostCount)[0] ?? null;
}

function dedupeById(actions: RecommendedAction[]): RecommendedAction[] {
  const seen = new Set<string>();
  return actions.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}
