import {
  generateDecisionSupport,
  sortActions,
} from '@ai-company/decision-support-engine';
import type {
  DecisionSupportResult,
  FunnelSnapshot,
  RecommendedAction,
} from '@ai-company/shared-types';
import type { FoodTruckBusinessMetrics } from './types';

/** FoodTruck-specific counts for adapter wording (not used by generic engine). */
export interface FoodTruckDecisionContext {
  pendingCount: number;
  approvedCount: number;
  activeCount: number;
}

export function foodTruckDecisionContextFromMetrics(
  metrics: FoodTruckBusinessMetrics,
): FoodTruckDecisionContext {
  const r = metrics.registry;
  return {
    pendingCount: r.pendingTrucks,
    approvedCount: r.approvedTrucks,
    activeCount: r.activeTrucks,
  };
}

/**
 * Generic funnel rules plus FoodTruck-IL wording. No autonomous execution.
 */
export function buildFoodTruckDecisionSupport(
  snapshot: FunnelSnapshot,
  context: FoodTruckDecisionContext,
): DecisionSupportResult {
  const base = generateDecisionSupport(snapshot);
  const extra: RecommendedAction[] = [];
  const inactive = Math.max(0, context.approvedCount - context.activeCount);
  const bn = snapshot.health.mainBottleneck;

  if (bn && bn.rate < 50) {
    extra.push({
      id: `${snapshot.projectId}-bottleneck-detail`,
      projectId: snapshot.projectId,
      projectName: snapshot.projectName,
      priority: 'P1',
      category: 'operations',
      title: `Investigate ${bn.fromLabel} → ${bn.toLabel} bottleneck`,
      reason:
        inactive > 0
          ? `${inactive} approved truck(s) are not active.`
          : `${bn.fromLabel} → ${bn.toLabel} conversion is ${bn.rate}%.`,
      expectedImpact: 'Increase active trucks.',
      source: 'funnel-engine',
      requiresApproval: true,
    });
  }

  if (inactive > 0) {
    extra.push({
      id: `${snapshot.projectId}-inactive-approved`,
      projectId: snapshot.projectId,
      projectName: snapshot.projectName,
      priority: inactive > 5 ? 'P1' : 'P2',
      category: 'sales',
      title: 'Contact approved trucks that are not active',
      reason: `${inactive} approved truck(s) have not recorded activity in the last 7 days.`,
      expectedImpact: 'Convert approved registrations into active operators.',
      source: 'funnel-engine',
      requiresApproval: true,
    });
  }

  if (context.pendingCount > 0) {
    extra.push({
      id: `${snapshot.projectId}-approval-backlog`,
      projectId: snapshot.projectId,
      projectName: snapshot.projectName,
      priority: context.pendingCount > 3 ? 'P1' : 'P2',
      category: 'operations',
      title: 'Review approval backlog',
      reason: `${context.pendingCount} truck registration(s) pending approval.`,
      expectedImpact: 'Clear pending reviews to unblock funnel progression.',
      source: 'funnel-engine',
      requiresApproval: true,
    });
  }

  if (inactive > 0) {
    extra.push({
      id: `${snapshot.projectId}-investigate-inactive`,
      projectId: snapshot.projectId,
      projectName: snapshot.projectName,
      priority: 'P2',
      category: 'product',
      title: 'Investigate inactive approved trucks',
      reason: `${inactive} approved truck(s) are registered but not active.`,
      expectedImpact: 'Identify blockers to activation and owner onboarding.',
      source: 'funnel-engine',
      requiresApproval: true,
    });
  }

  const merged = sortActions([...base.actions, ...extra]);
  const byId = new Map<string, RecommendedAction>();
  for (const a of merged) {
    if (!byId.has(a.id)) byId.set(a.id, a);
  }

  return {
    projectId: snapshot.projectId,
    projectName: snapshot.projectName,
    actions: sortActions([...byId.values()]),
    generatedAt: new Date().toISOString(),
  };
}
