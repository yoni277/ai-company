import type { ProjectHealth } from '@ai-company/shared-types';

const RANK: Record<ProjectHealth, number> = {
  healthy: 0,
  at_risk: 1,
  critical: 2,
  paused: -1,
  archived: -2,
};

/**
 * Cross-project rollup: the company is as healthy as its least-healthy live project.
 * Paused/archived projects are ignored.
 */
export function rollupCompanyHealth(statuses: ProjectHealth[]): ProjectHealth {
  const live = statuses.filter((s) => RANK[s] >= 0);
  if (live.length === 0) return 'healthy';
  const worst = live.reduce((a, b) => (RANK[a] >= RANK[b] ? a : b));
  return worst;
}

export function hoursSince(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5);
}
