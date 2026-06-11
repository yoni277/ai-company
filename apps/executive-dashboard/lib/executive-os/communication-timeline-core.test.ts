import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTimeline,
  LINEAGE_STAGE_ORDER,
  type LineageItem,
  type LineageStageKey,
  type TimelineRaw,
} from './communication-timeline-core';

const NOW = '2026-06-11T00:00:00.000Z';

function item(over: Partial<LineageItem> = {}): LineageItem {
  return { id: 'x', title: 't', ...over };
}

function stage(t: ReturnType<typeof buildTimeline>, key: LineageStageKey) {
  const s = t.stages.find((x) => x.key === key);
  assert.ok(s, `stage ${key} present`);
  return s!;
}

// ---- empty chain (zero-state valid) ----
test('directive with no downstream → benign empties, no gap, no synthesis', () => {
  const raw: TimelineRaw = {
    sourceType: 'directive',
    sourceId: 'd1',
    origin: item({ id: 'd1', title: 'Pricing', when: '2026-06-10T00:00:00.000Z' }),
    responses: [],
    reports: [],
    proposals: [],
    work: [],
  };
  const t = buildTimeline(raw, NOW);
  assert.equal(t.hasGap, false);
  assert.equal(t.bottleneck, null, 'no synthesis on a trivial/empty chain (F5)');
  assert.equal(stage(t, 'responses').status, 'empty');
  assert.equal(stage(t, 'reports').status, 'empty');
  assert.equal(t.currentStageKey, 'origin');
});

// ---- the headline case: zero-conversion stalled directive (AC #2) ----
test('directive: 3 reports · 0 proposals → proposals is a GAP, stated as stalled', () => {
  const raw: TimelineRaw = {
    sourceType: 'directive',
    sourceId: 'd1',
    origin: item({ id: 'd1', title: 'Pricing', when: '2026-06-02T00:00:00.000Z' }),
    responses: [
      item({ id: 'r1', status: 'done', when: '2026-06-03T00:00:00.000Z' }),
      item({ id: 'r2', status: 'done' }),
      item({ id: 'r3', status: 'done' }),
    ],
    reports: [
      item({ id: 'rep1', when: '2026-06-05T00:00:00.000Z' }),
      item({ id: 'rep2' }),
      item({ id: 'rep3' }),
    ],
    proposals: [],
    work: [],
  };
  const t = buildTimeline(raw, NOW);
  assert.equal(t.hasGap, true);
  const proposals = stage(t, 'proposals');
  assert.equal(proposals.status, 'gap');
  assert.equal(proposals.expected, 1);
  assert.equal(proposals.count, 0);
  assert.equal(t.currentStageKey, 'proposals', 'current = the gap stage');
  assert.ok(t.bottleneck, 'gap produces a bottleneck synthesis');
  assert.match(t.bottleneck!.en, /3 reports · 0 proposals/);
  assert.match(t.bottleneck!.en, /stalled 6d/); // 06-05 → 06-11
  assert.ok(t.bottleneck!.he.length > 0, 'Hebrew synthesis present');
  // work is empty but NOT a second gap (its upstream proposals produced 0)
  assert.equal(stage(t, 'work').status, 'empty');
});

// ---- full healthy chain ----
test('directive: full chain present → no gap; work is current stage', () => {
  const raw: TimelineRaw = {
    sourceType: 'directive',
    sourceId: 'd1',
    origin: item({ id: 'd1', when: '2026-06-02T00:00:00.000Z' }),
    responses: [item({ id: 'r1', status: 'done' })],
    reports: [item({ id: 'rep1' })],
    proposals: [item({ id: 'p1', status: 'proposed' })],
    work: [item({ id: 'w1', status: 'proposed', when: '2026-06-09T00:00:00.000Z' })],
    decisions: [],
    tasks: [],
  };
  const t = buildTimeline(raw, NOW);
  assert.equal(t.hasGap, false);
  assert.equal(t.currentStageKey, 'work');
  assert.equal(t.bottleneck, null);
  assert.equal(stage(t, 'decisions').status, 'empty'); // terminal/optional, never a gap
  assert.equal(stage(t, 'tasks').status, 'empty');
});

// ---- errored responder surfaces as error status ----
test('directive: an errored responder → responses stage status=error', () => {
  const raw: TimelineRaw = {
    sourceType: 'directive',
    sourceId: 'd1',
    origin: item({ id: 'd1' }),
    responses: [item({ id: 'r1', status: 'done' }), item({ id: 'r2', status: 'error' })],
    reports: [item({ id: 'rep1' })],
    proposals: [item({ id: 'p1' })],
    work: [item({ id: 'w1' })],
  };
  const t = buildTimeline(raw, NOW);
  assert.equal(stage(t, 'responses').status, 'error');
  assert.ok(stage(t, 'responses').note);
});

// ---- meeting: responses/reports/proposals N/A; origin→work direct, empty is benign ----
test('meeting: response/report/proposal stages are not_applicable; empty work is not a gap', () => {
  const raw: TimelineRaw = {
    sourceType: 'meeting',
    sourceId: 'm1',
    origin: item({ id: 'm1', title: 'GTM', when: '2026-06-10T00:00:00.000Z' }),
    work: [],
    decisions: [],
    notApplicable: ['responses', 'reports', 'proposals'],
  };
  const t = buildTimeline(raw, NOW);
  assert.equal(stage(t, 'responses').status, 'not_applicable');
  assert.equal(stage(t, 'reports').status, 'not_applicable');
  assert.equal(stage(t, 'proposals').status, 'not_applicable');
  assert.equal(stage(t, 'work').status, 'empty', 'no upstream proposals → not a gap');
  assert.equal(t.hasGap, false);
  assert.equal(t.bottleneck, null);
});

// ---- meeting with emitted work ----
test('meeting: with work present → work is current stage, no gap', () => {
  const raw: TimelineRaw = {
    sourceType: 'meeting',
    sourceId: 'm1',
    origin: item({ id: 'm1', title: 'GTM', when: '2026-06-10T00:00:00.000Z' }),
    work: [item({ id: 'w1', status: 'proposed', when: '2026-06-10T00:00:00.000Z' })],
    notApplicable: ['responses', 'reports', 'proposals'],
  };
  const t = buildTimeline(raw, NOW);
  assert.equal(t.currentStageKey, 'work');
  assert.equal(t.hasGap, false);
});

// ---- instruction: origin→work direct (authorize-on-send) ----
test('instruction: responses/reports/proposals N/A; work present is healthy', () => {
  const raw: TimelineRaw = {
    sourceType: 'instruction',
    sourceId: 'i1',
    origin: item({ id: 'i1', title: 'Channel test plan' }),
    work: [item({ id: 'w1', status: 'approved' })],
    decisions: [item({ id: 'dec1', status: 'approved' })],
    notApplicable: ['responses', 'reports', 'proposals'],
  };
  const t = buildTimeline(raw, NOW);
  assert.equal(t.hasGap, false);
  assert.equal(stage(t, 'work').status, 'present');
  assert.equal(stage(t, 'decisions').status, 'present');
  assert.equal(t.currentStageKey, 'decisions');
});

// ---- binary/trivial row: origin + single work, nothing broken → no synthesis ----
test('trivial row (origin + 1 work, no gap) → bottleneck is null (F5)', () => {
  const raw: TimelineRaw = {
    sourceType: 'work',
    sourceId: 'w1',
    origin: item({ id: 'w1', title: 'Lone work', when: '2026-06-10T00:00:00.000Z' }),
    work: [item({ id: 'w1' })],
    notApplicable: ['responses', 'reports', 'proposals'],
  };
  const t = buildTimeline(raw, NOW);
  assert.equal(t.bottleneck, null);
});

// ---- aging: undated chain yields null stalledDays, still classifies ----
test('undated chain → stalledDays null, gap still detected', () => {
  const raw: TimelineRaw = {
    sourceType: 'directive',
    sourceId: 'd1',
    origin: item({ id: 'd1' }),
    responses: [item({ id: 'r1', status: 'done' })],
    reports: [item({ id: 'rep1' })],
    proposals: [],
  };
  const t = buildTimeline(raw, NOW);
  assert.equal(t.stalledDays, null);
  assert.equal(t.hasGap, true);
  assert.ok(t.bottleneck);
  assert.doesNotMatch(t.bottleneck!.en, /stalled/, 'no aging phrase when undated');
});

// ---- stage ordering invariant ----
test('stages are always emitted in canonical order', () => {
  const raw: TimelineRaw = {
    sourceType: 'directive',
    sourceId: 'd1',
    origin: item({ id: 'd1' }),
  };
  const t = buildTimeline(raw, NOW);
  assert.deepEqual(
    t.stages.map((s) => s.key),
    [...LINEAGE_STAGE_ORDER],
  );
});
