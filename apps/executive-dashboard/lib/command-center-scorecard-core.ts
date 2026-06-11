/**
 * D7 / P0-3 — Evidence-based executive scorecard (PURE core).
 *
 * CA ruling: allowed states are PASS | FAIL | AT_RISK | NOT_MEASURED. No row may
 * fabricate success. If evidence is unavailable, NOT_MEASURED is preferred over
 * an inferred PASS. The deleted model had a fabricated 'PASS WITH RISKS' comfort
 * state and hardcoded PASS for CEO + Chief of Staff with no metric.
 *
 * Every row binds to a concrete, measurable signal already present in the loaded
 * snapshots. PASS requires that signal to be present AND healthy. Pure +
 * unit-tested; the server loader (command-center.ts) supplies the evidence.
 */

export type ExecutiveScoreStatus = 'PASS' | 'FAIL' | 'AT_RISK' | 'NOT_MEASURED';

export interface ExecutiveScorecardRow {
  role: string;
  status: ExecutiveScoreStatus;
  detail: string;
}

export interface ScorecardEvidence {
  /** CTO — platform liveness/health (always measurable: booleans are present). */
  cto: {
    githubLive: boolean;
    supabaseLive: boolean;
    supabaseHealthy: boolean;
    registryValid: boolean;
    registrySource: string; // 'database' when authoritative
  };
  /** COO — funnel intelligence presence + D8 structured pending-approval count. */
  coo: {
    funnelProjectCount: number;
    pendingApprovalCount: number; // structured (D8) — never the old regex
  };
  /** CFO — revenue maturity (live vs mock); absent projects → not measurable. */
  cfo: {
    totalProjects: number;
    mockProjectCount: number;
  };
  /** CEO — the command surface: is the action queue reachable (a measured load)? */
  ceo: {
    actionQueueReachable: boolean;
    actionQueueSize: number;
  };
  // Chief of Staff: no deterministic governance metric is bound for this role
  // yet → NOT_MEASURED (honest exposure, never a hardcoded PASS).
}

export function buildScorecard(e: ScorecardEvidence): ExecutiveScorecardRow[] {
  return [cto(e.cto), coo(e.coo), cfo(e.cfo), ceo(e.ceo), chiefOfStaff()];
}

function cto(c: ScorecardEvidence['cto']): ExecutiveScorecardRow {
  const dbHealthy = c.supabaseLive && c.supabaseHealthy;
  const allLive = c.githubLive && c.registryValid && c.registrySource === 'database';
  // The platform's own database being unhealthy is a real FAIL, not a risk.
  const status: ExecutiveScoreStatus = !dbHealthy ? 'FAIL' : allLive ? 'PASS' : 'AT_RISK';
  return {
    role: 'CTO',
    status,
    detail: `GitHub ${c.githubLive ? 'live' : 'mock'} · Supabase ${dbHealthy ? 'healthy' : 'degraded'} · Registry ${c.registrySource}`,
  };
}

function coo(c: ScorecardEvidence['coo']): ExecutiveScorecardRow {
  // No funnel intelligence → nothing to measure (not an inferred PASS).
  if (c.funnelProjectCount <= 0) {
    return { role: 'COO', status: 'NOT_MEASURED', detail: 'No funnel intelligence to measure' };
  }
  return {
    role: 'COO',
    status: 'PASS',
    detail: `Funnel active (${c.funnelProjectCount} project${c.funnelProjectCount === 1 ? '' : 's'}) · ${c.pendingApprovalCount} structured pending approval${c.pendingApprovalCount === 1 ? '' : 's'}`,
  };
}

function cfo(c: ScorecardEvidence['cfo']): ExecutiveScorecardRow {
  // No projects → no revenue maturity to measure.
  if (c.totalProjects <= 0) {
    return { role: 'CFO', status: 'NOT_MEASURED', detail: 'No projects to measure revenue maturity' };
  }
  if (c.mockProjectCount > 0) {
    return {
      role: 'CFO',
      status: 'AT_RISK',
      detail: `Data maturity gap: ${c.mockProjectCount}/${c.totalProjects} project(s) on mock revenue`,
    };
  }
  return { role: 'CFO', status: 'PASS', detail: 'All projects reporting live revenue' };
}

function ceo(c: ScorecardEvidence['ceo']): ExecutiveScorecardRow {
  // The action queue is the CEO's command surface. Reachable = a measured load
  // succeeded; unreachable = no measurable signal (NOT_MEASURED, not PASS).
  if (!c.actionQueueReachable) {
    return { role: 'CEO', status: 'NOT_MEASURED', detail: 'Action queue not reachable — no measured signal' };
  }
  return {
    role: 'CEO',
    status: 'PASS',
    detail: `Command surface reachable · ${c.actionQueueSize} action${c.actionQueueSize === 1 ? '' : 's'} in queue`,
  };
}

function chiefOfStaff(): ExecutiveScorecardRow {
  // Honest exposure: no deterministic governance metric is bound for this role.
  // Per CA, NOT_MEASURED is preferred over an inferred PASS.
  return {
    role: 'Chief of Staff',
    status: 'NOT_MEASURED',
    detail: 'No deterministic governance metric bound for this role yet',
  };
}
