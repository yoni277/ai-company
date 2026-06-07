import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outcomeProgressFraction } from '../src/progress.js';

test('baseline=0, target=100, current=50 → 0.5', () => {
  assert.equal(
    outcomeProgressFraction({ baselineValue: 0, targetValue: 100, currentValue: 50 }),
    0.5,
  );
});

test('current at baseline → 0', () => {
  assert.equal(
    outcomeProgressFraction({ baselineValue: 10, targetValue: 100, currentValue: 10 }),
    0,
  );
});

test('current at target → 1', () => {
  assert.equal(
    outcomeProgressFraction({ baselineValue: 10, targetValue: 100, currentValue: 100 }),
    1,
  );
});

test('current below baseline clamps to 0', () => {
  assert.equal(
    outcomeProgressFraction({ baselineValue: 10, targetValue: 100, currentValue: 5 }),
    0,
  );
});

test('current above target clamps to 1', () => {
  assert.equal(
    outcomeProgressFraction({ baselineValue: 10, targetValue: 100, currentValue: 200 }),
    1,
  );
});

test('decreasing target works (churn-style)', () => {
  // baseline 10% churn, target 4% churn, current 7% → halfway
  assert.equal(
    outcomeProgressFraction({ baselineValue: 10, targetValue: 4, currentValue: 7 }),
    0.5,
  );
});

test('null inputs return null', () => {
  assert.equal(
    outcomeProgressFraction({ baselineValue: null, targetValue: 100, currentValue: 50 }),
    null,
  );
  assert.equal(
    outcomeProgressFraction({ baselineValue: 0, targetValue: null, currentValue: 50 }),
    null,
  );
  assert.equal(
    outcomeProgressFraction({ baselineValue: 0, targetValue: 100, currentValue: null }),
    null,
  );
});

test('baseline === target → null (no scale)', () => {
  assert.equal(
    outcomeProgressFraction({ baselineValue: 50, targetValue: 50, currentValue: 50 }),
    null,
  );
});
