import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyWork,
  isAttentionState,
  ATTENTION_STATES,
  type WorkRowForState,
} from './work-state';

// Fixed clock so aging is deterministic. "Today" = 2026-06-09.
const NOW = '2026-06-09T00:00:00.000Z';

function row(over: Partial<WorkRowForState> = {}): WorkRowForState {
  return {
    approvalStatus: 'approved',
    executionStatus: 'open',
    dueDate: null,
    reviewDate: null,
    createdAt: '2026-06-04T00:00:00.000Z', // 5 days before NOW
    statusChangedAt: '2026-06-07T00:00:00.000Z', // 2 days before NOW
    awaitingCeoInput: false,
    ...over,
  };
}

// ---- the five CEO-attention states (AC12) ----

test('classify: proposed + dateless → needs_ceo_completion', () => {
  const { state } = classifyWork(row({ approvalStatus: 'proposed' }), NOW);
  assert.equal(state, 'needs_ceo_completion');
  assert.ok(isAttentionState(state));
});

test('classify: proposed + dated → awaiting_approval', () => {
  const { state } = classifyWork(
    row({ approvalStatus: 'proposed', dueDate: '2026-06-20' }),
    NOW,
  );
  assert.equal(state, 'awaiting_approval');
  assert.ok(isAttentionState(state));
});

test('classify: a review_date alone counts as a date (awaiting_approval, not needs_completion)', () => {
  const { state } = classifyWork(
    row({ approvalStatus: 'proposed', reviewDate: '2026-06-20' }),
    NOW,
  );
  assert.equal(state, 'awaiting_approval');
});

test('classify: approved + awaitingCeoInput → awaiting_ceo_input', () => {
  const { state } = classifyWork(row({ awaitingCeoInput: true }), NOW);
  assert.equal(state, 'awaiting_ceo_input');
  assert.ok(isAttentionState(state));
});

test('classify: execution blocked → blocked', () => {
  const { state } = classifyWork(row({ executionStatus: 'blocked' }), NOW);
  assert.equal(state, 'blocked');
  assert.ok(isAttentionState(state));
});

test('classify: approved, past due, not done → overdue', () => {
  const { state } = classifyWork(
    row({ executionStatus: 'in_progress', dueDate: '2026-06-01' }),
    NOW,
  );
  assert.equal(state, 'overdue');
  assert.ok(isAttentionState(state));
});

test('classify: ATTENTION_STATES is exactly the five', () => {
  assert.deepEqual(
    [...ATTENTION_STATES].sort(),
    ['awaiting_approval', 'awaiting_ceo_input', 'blocked', 'needs_ceo_completion', 'overdue'].sort(),
  );
});

// ---- non-attention states ----

test('classify: approved + in_progress + future due → in_progress (not attention)', () => {
  const { state } = classifyWork(
    row({ executionStatus: 'in_progress', dueDate: '2026-12-31' }),
    NOW,
  );
  assert.equal(state, 'in_progress');
  assert.equal(isAttentionState(state), false);
});

test('classify: approved + open + no date → open (not attention)', () => {
  const { state } = classifyWork(row(), NOW);
  assert.equal(state, 'open');
  assert.equal(isAttentionState(state), false);
});

test('classify: execution done wins over everything → done', () => {
  const { state } = classifyWork(
    row({ executionStatus: 'done', approvalStatus: 'proposed', dueDate: '2026-06-01' }),
    NOW,
  );
  assert.equal(state, 'done');
});

// ---- AC13 aging ----

test('aging: ageDays from created_at, daysInCurrentState from status_changed_at', () => {
  const { aging } = classifyWork(row(), NOW);
  assert.equal(aging.ageDays, 5, 'now − created_at');
  assert.equal(aging.daysInCurrentState, 2, 'now − status_changed_at — the "stuck right now" signal');
});

test('aging: days-in-state differs from age (proves it is not derived from created_at)', () => {
  const { aging } = classifyWork(
    row({ createdAt: '2026-05-09T00:00:00.000Z', statusChangedAt: '2026-06-08T00:00:00.000Z' }),
    NOW,
  );
  assert.equal(aging.ageDays, 31);
  assert.equal(aging.daysInCurrentState, 1);
});
