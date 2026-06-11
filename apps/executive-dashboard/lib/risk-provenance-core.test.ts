import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateHealthScore, healthScoreInputsFromMetrics } from '@ai-company/health-score';
import { partitionRiskProvenance, type RiskForProvenance } from './risk-provenance-core';

function risk(over: Partial<RiskForProvenance> = {}): RiskForProvenance {
  return { id: 'r', severity: 'critical', source: 'connector:github', ...over };
}

const NONE: ReadonlySet<string> = new Set();

// ---- only connector/system provenance feeds the deterministic count ----
test('mixed sources: only connector:*/system:* critical risks are counted', () => {
  const out = partitionRiskProvenance(
    [
      risk({ id: 'c1', source: 'connector:github', severity: 'critical' }),
      risk({ id: 's1', source: 'system:health-monitor', severity: 'critical' }),
      risk({ id: 'e1', source: 'executive:chief-of-staff', severity: 'critical' }),
      risk({ id: 'e2', source: 'executive:cto', severity: 'critical' }),
    ],
    NONE,
  );
  assert.equal(out.deterministicCriticalCount, 2, 'connector + system only; 2 executive excluded');
  // executive risks are still present (advisory), i.e. CEO-visible in topRisks
  const exec = out.marked.filter((m) => m.band === 'advisory');
  assert.equal(exec.length, 2);
  assert.ok(exec.every((m) => m.advisory === true && m.confirmed === false));
});

// ---- THE CORE REGRESSION LOCK: adding an executive critical risk must NOT
//      flip the deterministic health score ----
test('core lock: an executive:* critical risk does NOT move the health score', () => {
  const baseline = [risk({ id: 'c1', source: 'connector:github', severity: 'critical' })];
  const withExec = [
    ...baseline,
    risk({ id: 'e1', source: 'executive:chief-of-staff', severity: 'critical' }),
  ];

  const scoreOf = (rs: RiskForProvenance[]) => {
    const { deterministicCriticalCount } = partitionRiskProvenance(rs, NONE);
    return calculateHealthScore(
      healthScoreInputsFromMetrics({ githubOpenIssues: 0, criticalRisks: deterministicCriticalCount }),
    ).score;
  };

  assert.equal(
    scoreOf(withExec),
    scoreOf(baseline),
    'health score is identical with vs without the executive critical risk',
  );

  // And to prove the test is meaningful: an extra CONNECTOR critical risk DOES move it.
  const withConnector = [
    ...baseline,
    risk({ id: 'c2', source: 'connector:supabase', severity: 'critical' }),
  ];
  assert.notEqual(scoreOf(withConnector), scoreOf(baseline), 'a connector critical risk still moves the score');
});

// ---- confirmation path: a confirmed executive risk DOES enter scoring ----
test('confirmed executive risk (ceo_decisions) enters deterministic scoring', () => {
  const risks = [risk({ id: 'e1', source: 'executive:cfo', severity: 'critical' })];
  const unconfirmed = partitionRiskProvenance(risks, NONE);
  assert.equal(unconfirmed.deterministicCriticalCount, 0, 'advisory by default');

  const confirmed = partitionRiskProvenance(risks, new Set(['e1']));
  assert.equal(confirmed.deterministicCriticalCount, 1, 'confirmed → enters scoring');
  assert.equal(confirmed.marked[0]!.confirmed, true);
  assert.equal(confirmed.marked[0]!.advisory, false, 'confirmed risk is no longer advisory-only');
});

// ---- executive risks remain visible (advisory) in the marked output ----
test('executive risks stay CEO-visible (present in marked, flagged advisory)', () => {
  const out = partitionRiskProvenance(
    [risk({ id: 'e1', source: 'executive:vp-sales', severity: 'high' })],
    NONE,
  );
  assert.equal(out.marked.length, 1);
  assert.equal(out.marked[0]!.band, 'advisory');
  assert.equal(out.marked[0]!.advisory, true);
});

// ---- unknown/empty source → advisory + warning (never silently deterministic) ----
test('unknown/empty source fails safe to advisory and is surfaced as a warning', () => {
  const out = partitionRiskProvenance(
    [
      risk({ id: 'u1', source: 'manual-entry', severity: 'critical' }),
      risk({ id: 'u2', source: '', severity: 'critical' }),
      risk({ id: 'c1', source: 'connector:github', severity: 'critical' }),
    ],
    NONE,
  );
  assert.equal(out.deterministicCriticalCount, 1, 'only the connector risk scores; unknowns excluded');
  assert.deepEqual(out.unknownSources, ['manual-entry', '']);
  assert.equal(out.marked.find((m) => m.id === 'u1')!.advisory, true);
});

// ---- non-critical severities never inflate the deterministic count ----
test('only critical severity counts, regardless of band', () => {
  const out = partitionRiskProvenance(
    [
      risk({ id: 'c1', source: 'connector:github', severity: 'high' }),
      risk({ id: 'c2', source: 'connector:github', severity: 'critical' }),
    ],
    NONE,
  );
  assert.equal(out.deterministicCriticalCount, 1);
});
