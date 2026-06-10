import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleExecutiveContext,
  isContextPackEnabled,
  type ContextPackDeps,
} from './context-pack';
import {
  NO_BUSINESS_EVIDENCE,
  type ContextDecision,
  type ContextObjective,
  type ContextRisk,
  type ContextWorkItem,
  type BusinessEvidence,
} from './context-pack-shape';

function work(over: Partial<ContextWorkItem>): ContextWorkItem {
  return { id: 'w', title: 't', state: 'open', ageDays: 0, ownerExecutiveId: 'cto', priority: 'P2', ...over };
}

function makeDeps(over: Partial<{
  workItems: ContextWorkItem[];
  objectives: ContextObjective[];
  risks: ContextRisk[];
  decisions: ContextDecision[];
  currentStrategy: string | null;
  knownAssumptions: string[];
  businessName: string | null;
  evidence: BusinessEvidence | null;
}> = {}): ContextPackDeps {
  return {
    async readWorkItems() {
      return over.workItems ?? [];
    },
    async readObjectives() {
      return over.objectives ?? [];
    },
    async readRisks() {
      return over.risks ?? [];
    },
    async readDecisions() {
      return over.decisions ?? [];
    },
    async readMemory() {
      return {
        currentStrategy: over.currentStrategy ?? null,
        knownAssumptions: over.knownAssumptions ?? [],
      };
    },
    async readBusiness() {
      return { name: over.businessName ?? null };
    },
    async readEvidence() {
      return over.evidence ?? null;
    },
    now() {
      return '2026-06-10T00:00:00.000Z';
    },
  };
}

/** The FACTS block of a rendered context = text between "FACTS:" and "ASSUMPTIONS". */
function factsBlock(s: string): string {
  const start = s.indexOf('FACTS:');
  const end = s.indexOf('ASSUMPTIONS');
  return start >= 0 && end > start ? s.slice(start, end) : s.slice(Math.max(0, start));
}

// (a) caps hold
test('caps: objectives ≤10, topWork ≤8, risks ≤5, decisions ≤8, attention ≤5', async () => {
  const deps = makeDeps({
    objectives: Array.from({ length: 15 }, (_, i) => ({ id: `o${i}`, title: `Obj ${i}`, status: 'active' })),
    workItems: [
      ...Array.from({ length: 7 }, (_, i) => work({ id: `b${i}`, title: `Blocked ${i}`, state: 'blocked', ageDays: i + 1 })),
      ...Array.from({ length: 6 }, (_, i) => work({ id: `o${i}`, title: `Open ${i}`, state: 'open', ageDays: i })),
    ],
    risks: Array.from({ length: 8 }, (_, i) => ({ description: `Risk ${i}`, severity: 'high' })),
    decisions: Array.from({ length: 12 }, (_, i) => ({ title: `Dec ${i}`, status: 'approved' })),
  });
  const { pack, operationalContext } = await assembleExecutiveContext(deps, {
    executiveId: 'cto',
    projectSlug: 'acme',
    purpose: 'meeting',
  });
  assert.equal(pack.facts.objectives.length, 10);
  assert.ok(pack.facts.topWork.length <= 8, 'topWork capped at 8');
  assert.equal(pack.facts.risks.length, 5);
  assert.equal(pack.facts.recentDecisions.length, 8);
  assert.ok(pack.facts.attention.length <= 5, 'attention capped at 5');
  assert.match(operationalContext, /\(\+\d+ more\)/, 'truncation surfaced explicitly');
  assert.equal(pack.facts.workCounts.total, 13, 'counts cover the full set, not the cap');
});

test('caps: topWork ranks by urgency (severity × age) — blocked/old before fresh/open', async () => {
  const deps = makeDeps({
    workItems: [
      work({ id: 'fresh-open', title: 'Fresh open', state: 'open', ageDays: 0 }),
      work({ id: 'old-blocked', title: 'Old blocked', state: 'blocked', ageDays: 10 }),
    ],
  });
  const { pack } = await assembleExecutiveContext(deps, { executiveId: 'cto', projectSlug: 'acme', purpose: 'directive' });
  assert.equal(pack.facts.topWork[0]!.title, 'Old blocked');
});

// (b) empty business → honest empties, no synthetic data
test('empty business: evidence { available:false }, honest empties, no synthetic data', async () => {
  const { pack, companyContext, operationalContext } = await assembleExecutiveContext(makeDeps(), {
    executiveId: 'vp-sales',
    projectSlug: 'fresh-biz',
    purpose: 'instruction',
  });
  assert.deepEqual(pack.facts.evidence, { available: false });
  assert.equal(pack.facts.objectives.length, 0);
  assert.equal(pack.facts.topWork.length, 0);
  assert.equal(pack.facts.attention.length, 0);
  assert.equal(pack.facts.workCounts.total, 0);
  assert.deepEqual(pack.assumptions, []);
  // The exact D068 string, and no fabricated numbers/metrics.
  assert.ok(operationalContext.includes(NO_BUSINESS_EVIDENCE));
  assert.match(operationalContext, /Work: 0 item\(s\)/);
  assert.ok(!/\$\d|\d+%|signups|revenue|visitors/i.test(companyContext + operationalContext), 'no synthetic metrics');
});

test('evidence honesty: real evidence renders; never invented when absent', async () => {
  const deps = makeDeps({ evidence: { available: true, summary: '120 signups this week', metrics: [{ label: 'CTR', value: '4%' }] } });
  const { operationalContext } = await assembleExecutiveContext(deps, { executiveId: 'vp-marketing', projectSlug: 'acme', purpose: 'directive' });
  assert.ok(operationalContext.includes('120 signups this week'));
  assert.ok(!operationalContext.includes(NO_BUSINESS_EVIDENCE));
});

// (c) Layer-1 sources no OS/OF/tracker/governance content
test('Layer 1: no platform/governance artifacts leak (D082 boundary #1)', async () => {
  const deps = makeDeps({
    businessName: 'Acme Foods',
    currentStrategy: 'Win the weekly-shop segment',
    objectives: [{ id: 'o1', title: 'Launch MVP', status: 'active' }],
    knownAssumptions: ['Owners may pay for premium visibility'],
  });
  const { companyContext } = await assembleExecutiveContext(deps, { executiveId: 'cto', projectSlug: 'acme', purpose: 'meeting' });
  // Sources the right business data…
  assert.ok(companyContext.includes('Acme Foods'));
  assert.ok(companyContext.includes('Win the weekly-shop segment'));
  assert.ok(companyContext.includes('Launch MVP'));
  // …and none of the platform/governance vocabulary.
  assert.ok(
    !/\bOF-?\d|\bEPIC\b|\btracker\b|governance|\bL3\d\b|\bD0\d{2}\b|migration|Chief Architect/i.test(companyContext),
    'Layer 1 must not contain OS/OF/L/D/EPIC/tracker/governance content',
  );
});

// (d) known_assumptions only under ASSUMPTIONS, never FACTS
test('separation: known_assumptions render only under ASSUMPTIONS, never FACTS (D082)', async () => {
  const MARKER = 'ZZASSUMPTIONMARKERZZ';
  const deps = makeDeps({
    businessName: 'Acme',
    objectives: [{ id: 'o1', title: 'Real objective fact', status: 'active' }],
    decisions: [{ title: 'A real decision fact', status: 'approved' }],
    knownAssumptions: [MARKER],
  });
  const { companyContext, operationalContext, pack } = await assembleExecutiveContext(deps, {
    executiveId: 'cto',
    projectSlug: 'acme',
    purpose: 'directive',
  });
  // The marker is an assumption, never a fact.
  assert.ok(!pack.facts.objectives.some((o) => o.title.includes(MARKER)));
  for (const ctx of [companyContext, operationalContext]) {
    assert.ok(ctx.includes('ASSUMPTIONS'), 'has an ASSUMPTIONS heading');
    assert.ok(ctx.includes(MARKER), 'the assumption is present');
    assert.ok(!factsBlock(ctx).includes(MARKER), 'the assumption is NOT inside the FACTS block');
    // …and it appears after the ASSUMPTIONS heading.
    assert.ok(ctx.indexOf(MARKER) > ctx.indexOf('ASSUMPTIONS'));
  }
});

// flag
test('flag: CONTEXT_PACK_ENABLED — default off; on/all; per-purpose list', () => {
  assert.equal(isContextPackEnabled('instruction', {}), false);
  assert.equal(isContextPackEnabled('instruction', { CONTEXT_PACK_ENABLED: '' }), false);
  assert.equal(isContextPackEnabled('instruction', { CONTEXT_PACK_ENABLED: 'off' }), false);
  assert.equal(isContextPackEnabled('instruction', { CONTEXT_PACK_ENABLED: 'true' }), true);
  assert.equal(isContextPackEnabled('meeting', { CONTEXT_PACK_ENABLED: 'all' }), true);
  assert.equal(isContextPackEnabled('instruction', { CONTEXT_PACK_ENABLED: 'instruction,meeting' }), true);
  assert.equal(isContextPackEnabled('directive', { CONTEXT_PACK_ENABLED: 'instruction,meeting' }), false);
});
