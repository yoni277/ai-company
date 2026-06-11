import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHealthScore,
  healthScoreInputsFromMetrics,
  HEALTH_SCORE_SCORING_META,
} from '@ai-company/health-score';
import { SCORECARD_SCORING_META } from './command-center-scorecard-core';

// P1-1 — the two scoring engines that live in / are consumed by the app:
// health-score (computed in phase2-metrics) and the command-center scorecard.

test('health-score OUTPUT carries scoringVersion + policyVersion', () => {
  const out = calculateHealthScore(
    healthScoreInputsFromMetrics({ githubOpenIssues: 0, criticalRisks: 0 }),
  );
  assert.equal(out.scoringVersion, HEALTH_SCORE_SCORING_META.scoringVersion);
  assert.equal(out.policyVersion, HEALTH_SCORE_SCORING_META.policyVersion);
  assert.match(out.scoringVersion!, /^health-score@\d+$/);
  assert.match(out.policyVersion!, /^health-score#[0-9a-f]{8}$/);
  // the score itself is unchanged by versioning (no P0 semantics touched)
  assert.equal(out.score, 100);
  assert.equal(out.level, 'green');
});

test('command-center scorecard exposes a well-formed scoring meta', () => {
  assert.match(SCORECARD_SCORING_META.scoringVersion, /^command-center-scorecard@\d+$/);
  assert.match(SCORECARD_SCORING_META.policyVersion, /^command-center-scorecard#[0-9a-f]{8}$/);
});
