import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScoringMeta, policyVersion } from '@ai-company/shared-types';
import {
  PORTFOLIO_INTELLIGENCE_SCORING_META,
  aggregatePortfolioIntelligence,
} from '@ai-company/portfolio-intelligence-engine';
import { DECISION_SUPPORT_SCORING_META } from '@ai-company/decision-support-engine';
import {
  REVENUE_SCORING_META,
  aggregatePortfolioRevenue,
} from '@ai-company/revenue-intelligence-engine';

// P1-1 — scoring versioning. No persistence (scores computed at request time);
// the version rides on each engine's computed output object.

// ---- policyVersion: deterministic + weight-sensitive ----
test('policyVersion is deterministic and key-order independent', () => {
  const a = policyVersion('eng', { x: 5, y: 3 });
  assert.equal(a, policyVersion('eng', { x: 5, y: 3 }), 'same weights → same version');
  assert.equal(a, policyVersion('eng', { y: 3, x: 5 }), 'key order does not matter');
});

test('changing a weight changes policyVersion (auto-bump)', () => {
  const before = policyVersion('eng', { x: 5, y: 3 });
  const after = policyVersion('eng', { x: 6, y: 3 });
  assert.notEqual(before, after, 'a weight change must bump policyVersion');
});

// ---- buildScoringMeta: scoringVersion = algorithm identity, policyVersion = weights ----
test('scoringVersion is stable unless the algorithm identity changes; policyVersion tracks weights', () => {
  const m1 = buildScoringMeta('eng', 1, { w: 5 });
  const m2 = buildScoringMeta('eng', 1, { w: 6 }); // only the weight changed
  assert.equal(m1.scoringVersion, 'eng@1');
  assert.equal(m2.scoringVersion, 'eng@1', 'scoringVersion stable across a weight change');
  assert.notEqual(m1.policyVersion, m2.policyVersion, 'policyVersion bumped by the weight change');

  const m3 = buildScoringMeta('eng', 2, { w: 5 }); // algorithm identity bumped
  assert.notEqual(m1.scoringVersion, m3.scoringVersion, 'scoringVersion changes with the algorithm version');

  assert.match(m1.scoringVersion, /^eng@1$/);
  assert.match(m1.policyVersion, /^eng#[0-9a-f]{8}$/);
});

// ---- each engine exposes a well-formed scoring meta ----
test('engines expose well-formed scoring metas', () => {
  const metas = [
    PORTFOLIO_INTELLIGENCE_SCORING_META,
    DECISION_SUPPORT_SCORING_META,
    REVENUE_SCORING_META,
  ];
  for (const m of metas) {
    assert.match(m.scoringVersion, /@\d+$/, 'scoringVersion = engine@version');
    assert.match(m.policyVersion, /#[0-9a-f]{8}$/, 'policyVersion = engine#digest');
  }
  // distinct engines must have distinct identities
  const ids = new Set(metas.map((m) => m.scoringVersion.split('@')[0]));
  assert.equal(ids.size, metas.length, 'engine identities are distinct');
});

// ---- engine OUTPUT carries the version (not just the constant) ----
test('portfolio-intelligence and revenue engine output carries scoringVersion + policyVersion', () => {
  const portfolio = aggregatePortfolioIntelligence([]);
  assert.equal(portfolio.scoringVersion, PORTFOLIO_INTELLIGENCE_SCORING_META.scoringVersion);
  assert.equal(portfolio.policyVersion, PORTFOLIO_INTELLIGENCE_SCORING_META.policyVersion);

  const revenue = aggregatePortfolioRevenue([]);
  assert.equal(revenue.scoringVersion, REVENUE_SCORING_META.scoringVersion);
  assert.equal(revenue.policyVersion, REVENUE_SCORING_META.policyVersion);
});
