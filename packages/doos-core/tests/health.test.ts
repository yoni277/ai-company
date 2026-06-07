import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ObjectiveOutcome, Task } from '@ai-company/shared-types';
import { computeObjectiveHealth, STALENESS_DAYS } from '../src/health.js';

const NOW = Date.UTC(2026, 5, 4, 12, 0, 0); // 2026-06-04T12:00:00Z

function outcome(over: Partial<ObjectiveOutcome> = {}): ObjectiveOutcome {
  return {
    id: 'o',
    objectiveId: 'obj',
    createdAt: '',
    updatedAt: '',
    name: 'x',
    metricUnit: null,
    baselineValue: 0,
    targetValue: 100,
    currentValue: 50,
    measurementSource: 'manual',
    status: 'in_progress',
    lastMeasuredAt: new Date(NOW).toISOString(),
    ...over,
  };
}

function tk(over: Partial<Task> = {}): Task {
  return {
    id: 't',
    createdAt: '',
    updatedAt: '',
    objectiveId: 'obj',
    directiveId: null,
    title: 't',
    description: null,
    capabilityRequired: 'noop',
    ownerId: null,
    status: 'in_progress',
    evidenceRequired: { minTier: 'E2', requiredKinds: [], minCount: 1 },
    dueAt: null,
    completedAt: null,
    completedBy: null,
    proposalId: null,
    ...over,
  };
}

test('healthy when active + fresh + no failures', () => {
  const h = computeObjectiveHealth({ status: 'active' }, [outcome()], [tk()], NOW);
  assert.equal(h, 'healthy');
});

test('objective.status=blocked → critical', () => {
  const h = computeObjectiveHealth({ status: 'blocked' }, [], [], NOW);
  assert.equal(h, 'critical');
});

test('outcome.status=failed → critical', () => {
  const h = computeObjectiveHealth(
    { status: 'active' },
    [outcome({ status: 'failed' })],
    [tk()],
    NOW,
  );
  assert.equal(h, 'critical');
});

test('task.status=blocked → critical', () => {
  const h = computeObjectiveHealth(
    { status: 'active' },
    [outcome()],
    [tk({ status: 'blocked' })],
    NOW,
  );
  assert.equal(h, 'critical');
});

test('stale outcome (older than STALENESS_DAYS) → at_risk', () => {
  const stale = new Date(NOW - (STALENESS_DAYS + 1) * 86400_000).toISOString();
  const h = computeObjectiveHealth(
    { status: 'active' },
    [outcome({ lastMeasuredAt: stale })],
    [tk()],
    NOW,
  );
  assert.equal(h, 'at_risk');
});

test('overdue task → at_risk', () => {
  const yesterday = new Date(NOW - 86400_000).toISOString();
  const h = computeObjectiveHealth(
    { status: 'active' },
    [outcome()],
    [tk({ dueAt: yesterday })],
    NOW,
  );
  assert.equal(h, 'at_risk');
});

test('overdue but completed task does NOT downgrade', () => {
  const yesterday = new Date(NOW - 86400_000).toISOString();
  const h = computeObjectiveHealth(
    { status: 'active' },
    [outcome()],
    [tk({ dueAt: yesterday, status: 'completed' })],
    NOW,
  );
  assert.equal(h, 'healthy');
});

test('outcome never measured does NOT count as stale', () => {
  const h = computeObjectiveHealth(
    { status: 'active' },
    [outcome({ lastMeasuredAt: null })],
    [],
    NOW,
  );
  assert.equal(h, 'healthy');
});
