import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CreateTaskOutcomeInput } from '@ai-company/shared-types';
import { validateCreateOutcomeInput } from '../src/outcome-validator.js';

const ISO_NOW = '2026-06-05T22:00:00Z';
const ISO_START = '2026-06-04T00:00:00Z';
const ISO_END = '2026-06-06T00:00:00Z';

function good(over: Partial<CreateTaskOutcomeInput> = {}): CreateTaskOutcomeInput {
  return {
    taskId: 't1',
    metricName: 'verified_truck_owners',
    metricUnit: 'count',
    baselineValue: 0,
    observedValue: 12,
    direction: 'increase',
    observedAt: ISO_NOW,
    windowStart: ISO_START,
    windowEnd: ISO_END,
    source: 'manual',
    sourceRef: null,
    recordedBy: 'yoni',
    notes: null,
    ...over,
  };
}

// ----- baseline -----

test('outcome: well-formed input passes', () => {
  const r = validateCreateOutcomeInput(good());
  assert.equal(r.valid, true);
});

// ----- Rule 1: recordedBy -----

test('outcome: empty recordedBy rejected', () => {
  const r = validateCreateOutcomeInput(good({ recordedBy: '' }));
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((s) => s.includes('recordedBy')));
});

test('outcome: whitespace-only recordedBy rejected', () => {
  const r = validateCreateOutcomeInput(good({ recordedBy: '   ' }));
  assert.equal(r.valid, false);
});

// ----- Rule 2: metricName regex (anti-subjective) -----

test('outcome: spacey/subjective metricName rejected (anti-subjective)', () => {
  const r = validateCreateOutcomeInput(good({ metricName: 'campaign was successful' }));
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((s) => s.includes('metricName')));
});

test('outcome: ALL_CAPS metricName rejected', () => {
  const r = validateCreateOutcomeInput(good({ metricName: 'Verified_Truck_Owners' }));
  assert.equal(r.valid, false);
});

test('outcome: metricName starting with digit rejected', () => {
  const r = validateCreateOutcomeInput(good({ metricName: '1st_metric' }));
  assert.equal(r.valid, false);
});

test('outcome: identifier-style metricName accepted', () => {
  const r = validateCreateOutcomeInput(good({ metricName: 'mrr_ils_30d' }));
  assert.equal(r.valid, true);
});

// ----- Rule 3: numbers -----

test('outcome: non-finite baselineValue rejected', () => {
  const r = validateCreateOutcomeInput(good({ baselineValue: Number.NaN }));
  assert.equal(r.valid, false);
});

test('outcome: non-finite observedValue rejected', () => {
  const r = validateCreateOutcomeInput(good({ observedValue: Number.POSITIVE_INFINITY }));
  assert.equal(r.valid, false);
});

// ----- Rule 4: direction-math consistency -----

test('outcome: direction=increase but observed <= baseline rejected', () => {
  const r = validateCreateOutcomeInput(
    good({ baselineValue: 10, observedValue: 5, direction: 'increase' }),
  );
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((s) => s.toLowerCase().includes('increase')));
});

test('outcome: direction=decrease but observed >= baseline rejected', () => {
  const r = validateCreateOutcomeInput(
    good({ baselineValue: 5, observedValue: 10, direction: 'decrease' }),
  );
  assert.equal(r.valid, false);
});

test('outcome: direction=unchanged but values differ rejected', () => {
  const r = validateCreateOutcomeInput(
    good({ baselineValue: 5, observedValue: 6, direction: 'unchanged' }),
  );
  assert.equal(r.valid, false);
});

test('outcome: direction=unchanged with equal values accepted', () => {
  const r = validateCreateOutcomeInput(
    good({ baselineValue: 5, observedValue: 5, direction: 'unchanged' }),
  );
  assert.equal(r.valid, true);
});

test('outcome: direction=decrease with observed < baseline accepted', () => {
  const r = validateCreateOutcomeInput(
    good({ baselineValue: 10, observedValue: 5, direction: 'decrease' }),
  );
  assert.equal(r.valid, true);
});

// ----- Rules 5 + 6 + 7: time windowing -----

test('outcome: non-ISO observedAt rejected', () => {
  const r = validateCreateOutcomeInput(good({ observedAt: 'yesterday' }));
  assert.equal(r.valid, false);
});

test('outcome: windowEnd before windowStart rejected', () => {
  const r = validateCreateOutcomeInput(
    good({ windowStart: ISO_END, windowEnd: ISO_START }),
  );
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((s) => s.includes('windowStart must be <= windowEnd')));
});

test('outcome: observedAt before window rejected', () => {
  const r = validateCreateOutcomeInput(
    good({ observedAt: '2026-06-03T00:00:00Z' }),
  );
  assert.equal(r.valid, false);
});

test('outcome: observedAt after window rejected', () => {
  const r = validateCreateOutcomeInput(
    good({ observedAt: '2026-06-07T00:00:00Z' }),
  );
  assert.equal(r.valid, false);
});

test('outcome: observedAt equal to windowStart accepted (inclusive boundary)', () => {
  const r = validateCreateOutcomeInput(good({ observedAt: ISO_START }));
  assert.equal(r.valid, true);
});

test('outcome: observedAt equal to windowEnd accepted (inclusive boundary)', () => {
  const r = validateCreateOutcomeInput(good({ observedAt: ISO_END }));
  assert.equal(r.valid, true);
});

// ----- Rules 8 + 9 + 10: source / sourceRef -----

test('outcome: invalid source value rejected', () => {
  const r = validateCreateOutcomeInput(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    good({ source: 'gut_feeling' as any }),
  );
  assert.equal(r.valid, false);
});

test('outcome: source=connector_metric without sourceRef rejected', () => {
  const r = validateCreateOutcomeInput(
    good({ source: 'connector_metric', sourceRef: null }),
  );
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((s) => s.includes('sourceRef')));
});

test('outcome: source=verified_measurement without sourceRef rejected', () => {
  const r = validateCreateOutcomeInput(
    good({ source: 'verified_measurement', sourceRef: '' }),
  );
  assert.equal(r.valid, false);
});

test('outcome: source=manual with no sourceRef accepted', () => {
  const r = validateCreateOutcomeInput(good({ source: 'manual', sourceRef: null }));
  assert.equal(r.valid, true);
});

test('outcome: source=connector_metric with sourceRef accepted', () => {
  const r = validateCreateOutcomeInput(
    good({
      source: 'connector_metric',
      sourceRef: 'foodtruck-il-sync-run-1234',
    }),
  );
  assert.equal(r.valid, true);
});
