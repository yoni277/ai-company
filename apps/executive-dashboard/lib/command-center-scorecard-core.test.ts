import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScorecard,
  type ExecutiveScorecardRow,
  type ScorecardEvidence,
} from './command-center-scorecard-core';

/** All-healthy evidence; tests override the slice they exercise. */
function evidence(over: Partial<ScorecardEvidence> = {}): ScorecardEvidence {
  return {
    cto: { githubLive: true, supabaseLive: true, supabaseHealthy: true, registryValid: true, registrySource: 'database' },
    coo: { funnelProjectCount: 3, pendingApprovalCount: 9 },
    cfo: { totalProjects: 2, mockProjectCount: 0 },
    ceo: { actionQueueReachable: true, actionQueueSize: 4 },
    ...over,
  };
}

function row(rows: ExecutiveScorecardRow[], role: string): ExecutiveScorecardRow {
  const r = rows.find((x) => x.role === role);
  assert.ok(r, `row ${role} present`);
  return r!;
}

// ---- 'PASS WITH RISKS' is no longer constructible (no producer) ----
test("no row ever produces the fabricated 'PASS WITH RISKS' state", () => {
  // Exercise a spread of evidence permutations.
  const variants: ScorecardEvidence[] = [
    evidence(),
    evidence({ cto: { githubLive: false, supabaseLive: true, supabaseHealthy: true, registryValid: false, registrySource: 'mock' } }),
    evidence({ cto: { githubLive: true, supabaseLive: true, supabaseHealthy: false, registryValid: true, registrySource: 'database' } }),
    evidence({ coo: { funnelProjectCount: 0, pendingApprovalCount: 0 } }),
    evidence({ cfo: { totalProjects: 0, mockProjectCount: 0 } }),
    evidence({ cfo: { totalProjects: 3, mockProjectCount: 2 } }),
    evidence({ ceo: { actionQueueReachable: false, actionQueueSize: 0 } }),
  ];
  const allowed = new Set(['PASS', 'FAIL', 'AT_RISK', 'NOT_MEASURED']);
  for (const v of variants) {
    for (const r of buildScorecard(v)) {
      assert.ok(allowed.has(r.status), `status ${r.status} is one of the four allowed`);
      assert.notEqual(r.status as string, 'PASS WITH RISKS');
    }
  }
});

// ---- PASS requires a present, valid metric (no fabricated PASS) ----
test('CEO + Chief of Staff are no longer hardcoded PASS', () => {
  const rows = buildScorecard(evidence({ ceo: { actionQueueReachable: false, actionQueueSize: 0 } }));
  assert.equal(row(rows, 'CEO').status, 'NOT_MEASURED', 'CEO without a reachable action queue → NOT_MEASURED, not PASS');
  assert.equal(row(rows, 'Chief of Staff').status, 'NOT_MEASURED', 'CoS has no bound metric → NOT_MEASURED, never hardcoded PASS');
});

test('CEO PASS only when the action queue is actually reachable (evidence-bound)', () => {
  assert.equal(row(buildScorecard(evidence()), 'CEO').status, 'PASS');
  assert.equal(
    row(buildScorecard(evidence({ ceo: { actionQueueReachable: false, actionQueueSize: 0 } })), 'CEO').status,
    'NOT_MEASURED',
  );
});

// ---- missing metric → NOT_MEASURED (per role) ----
test('absent metric → NOT_MEASURED for COO (no funnel) and CFO (no projects)', () => {
  const noFunnel = buildScorecard(evidence({ coo: { funnelProjectCount: 0, pendingApprovalCount: 0 } }));
  assert.equal(row(noFunnel, 'COO').status, 'NOT_MEASURED');

  const noProjects = buildScorecard(evidence({ cfo: { totalProjects: 0, mockProjectCount: 0 } }));
  assert.equal(row(noProjects, 'CFO').status, 'NOT_MEASURED');
});

// ---- degraded signal → AT_RISK / FAIL, never PASS ----
test('degraded supabase → FAIL (not PASS); mock provenance → AT_RISK', () => {
  const dbDown = buildScorecard(
    evidence({ cto: { githubLive: true, supabaseLive: true, supabaseHealthy: false, registryValid: true, registrySource: 'database' } }),
  );
  assert.equal(row(dbDown, 'CTO').status, 'FAIL', 'platform DB unhealthy is a real failure');

  const mock = buildScorecard(
    evidence({ cto: { githubLive: false, supabaseLive: true, supabaseHealthy: true, registryValid: false, registrySource: 'mock' } }),
  );
  assert.equal(row(mock, 'CTO').status, 'AT_RISK', 'degraded/mock provenance → AT_RISK, not PASS');

  const allLive = buildScorecard(evidence());
  assert.equal(row(allLive, 'CTO').status, 'PASS');
});

// ---- CFO maturity gap → AT_RISK (replaces the deleted 'PASS WITH RISKS') ----
test('CFO with projects on mock revenue → AT_RISK, all-live → PASS', () => {
  assert.equal(row(buildScorecard(evidence({ cfo: { totalProjects: 3, mockProjectCount: 2 } })), 'CFO').status, 'AT_RISK');
  assert.equal(row(buildScorecard(evidence({ cfo: { totalProjects: 3, mockProjectCount: 0 } })), 'CFO').status, 'PASS');
});

// ---- COO reflects the D8 STRUCTURED approval count ----
test('COO row surfaces the structured pending-approval count (D8)', () => {
  const rows = buildScorecard(evidence({ coo: { funnelProjectCount: 2, pendingApprovalCount: 9 } }));
  const coo = row(rows, 'COO');
  assert.equal(coo.status, 'PASS');
  assert.match(coo.detail, /9 structured pending approval/);
});
