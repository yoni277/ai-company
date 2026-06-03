import type {
  FunnelConversion,
  FunnelDefinition,
  FunnelDropOff,
  FunnelHealth,
  FunnelMetric,
  FunnelSnapshot,
  FunnelStage,
} from '@ai-company/shared-types';

export type StageCounts = Record<string, number>;

/**
 * Deterministic business funnel intelligence. No AI. No LLM.
 *
 * Accepts stage configuration and counts; returns conversions, drop-offs,
 * and funnel health including the main bottleneck (lowest adjacent conversion).
 */
export function analyzeFunnel(
  definition: FunnelDefinition,
  countsByStageId: StageCounts,
): FunnelSnapshot {
  const stages = sortStages(definition.stages);
  const metrics: FunnelMetric[] = stages.map((s) => ({
    stageId: s.id,
    count: Math.max(0, countsByStageId[s.id] ?? 0),
  }));

  const conversions = buildConversions(stages, countsByStageId);
  const dropOffs = buildDropOffs(conversions);
  const health = buildFunnelHealth(conversions, dropOffs);

  return {
    projectId: definition.projectId,
    projectName: definition.projectName,
    stages,
    metrics,
    conversions,
    health,
    capturedAt: new Date().toISOString(),
  };
}

/** CEO brief line — deterministic, no LLM. */
export function formatFunnelSummary(snapshot: FunnelSnapshot): string {
  const parts = snapshot.metrics.map((m) => {
    const stage = snapshot.stages.find((s) => s.id === m.stageId);
    const label = (stage?.label ?? m.stageId).toLowerCase();
    return `${m.count} ${label}`;
  });
  const counts = parts.join(', ');
  const bn = snapshot.health.mainBottleneck;
  const bottleneck = bn
    ? ` Main bottleneck: ${bn.fromLabel} → ${bn.toLabel}.`
    : '';
  return `${snapshot.projectName} funnel: ${counts}.${bottleneck}`;
}

function sortStages(stages: FunnelStage[]): FunnelStage[] {
  return [...stages].sort((a, b) => a.order - b.order);
}

function buildConversions(
  stages: FunnelStage[],
  countsByStageId: StageCounts,
): FunnelConversion[] {
  const conversions: FunnelConversion[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i]!;
    const to = stages[i + 1]!;
    const fromCount = Math.max(0, countsByStageId[from.id] ?? 0);
    const toCount = Math.max(0, countsByStageId[to.id] ?? 0);
    const rate =
      fromCount > 0 ? Math.round((toCount / fromCount) * 1000) / 10 : 0;
    conversions.push({
      fromStageId: from.id,
      toStageId: to.id,
      fromLabel: from.label,
      toLabel: to.label,
      rate,
      fromCount,
      toCount,
    });
  }
  return conversions;
}

function buildDropOffs(conversions: FunnelConversion[]): FunnelDropOff[] {
  return conversions.map((c) => ({
    fromStageId: c.fromStageId,
    toStageId: c.toStageId,
    fromLabel: c.fromLabel,
    toLabel: c.toLabel,
    lostCount: Math.max(0, c.fromCount - c.toCount),
    dropOffRate:
      c.fromCount > 0
        ? Math.round(((c.fromCount - c.toCount) / c.fromCount) * 1000) / 10
        : 0,
  }));
}

function buildFunnelHealth(
  conversions: FunnelConversion[],
  dropOffs: FunnelDropOff[],
): FunnelHealth {
  const withVolume = conversions.filter((c) => c.fromCount > 0);
  const bottlenecks = [...withVolume].sort((a, b) => a.rate - b.rate);
  const mainBottleneck = bottlenecks[0] ?? null;
  const worstRate = mainBottleneck?.rate ?? 100;
  const status: FunnelHealth['status'] =
    worstRate < 30 ? 'critical' : worstRate < 50 ? 'warning' : 'healthy';

  return {
    status,
    mainBottleneck,
    bottlenecks: bottlenecks.slice(0, 3),
    dropOffs: dropOffs.filter((d) => d.lostCount > 0),
  };
}
