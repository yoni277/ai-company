import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertApprovable,
  NeedsCeoCompletionError,
  approveWork,
  rejectWork,
  setWorkExecutionStatus,
  assembleAttentionQueue,
  type WorkSpineStore,
  type ApprovableWork,
  type DecisionRequest,
  type ExecutionStatus,
  type AttentionSourceRow,
} from './work-control-core';

const FIXED_NOW = '2026-06-09T12:00:00.000Z';

interface Recorder {
  decisions: DecisionRequest[];
  approved: Array<{ workId: string; decisionId: string; at: string }>;
  rejected: Array<{ workId: string; at: string }>;
  executions: Array<{ workId: string; to: ExecutionStatus; at: string; expectFrom?: string }>;
}

function fakeStore(
  row: ApprovableWork | null,
  rec: Recorder,
  decisionId = 'decision-1',
): WorkSpineStore {
  return {
    now: () => FIXED_NOW,
    async getApprovable() {
      return row;
    },
    async createDecision(input) {
      rec.decisions.push(input);
      return { id: decisionId };
    },
    async markApproved(workId, dId, at) {
      rec.approved.push({ workId, decisionId: dId, at });
    },
    async markRejected(workId, at) {
      rec.rejected.push({ workId, at });
    },
    async setExecution(workId, to, at, expectFrom) {
      rec.executions.push({ workId, to, at, ...(expectFrom ? { expectFrom } : {}) });
    },
  };
}

function recorder(): Recorder {
  return { decisions: [], approved: [], rejected: [], executions: [] };
}

function approvable(over: Partial<ApprovableWork> = {}): ApprovableWork {
  return {
    id: 'w1',
    projectSlug: 'acme',
    title: 'Stand up staging',
    detail: 'do the thing',
    ownerExecutiveId: 'cto',
    approvalStatus: 'proposed',
    dueDate: '2026-06-20',
    reviewDate: null,
    ...over,
  };
}

// ---- assertApprovable (the AC2 gate) ----

test('assertApprovable: dateless work throws NeedsCeoCompletionError', () => {
  assert.throws(
    () => assertApprovable({ owner_executive_id: 'cto', due_date: null, review_date: null }),
    (e: unknown) => e instanceof NeedsCeoCompletionError && /date or review checkpoint/.test((e as Error).message),
  );
});

test('assertApprovable: ownerless work throws NeedsCeoCompletionError', () => {
  assert.throws(
    () => assertApprovable({ owner_executive_id: null, due_date: '2026-06-20', review_date: null }),
    (e: unknown) => e instanceof NeedsCeoCompletionError && /an owner/.test((e as Error).message),
  );
});

test('assertApprovable: owner + due_date passes', () => {
  assert.doesNotThrow(() =>
    assertApprovable({ owner_executive_id: 'cto', due_date: '2026-06-20', review_date: null }),
  );
});

test('assertApprovable: owner + review_date passes (review counts as a date)', () => {
  assert.doesNotThrow(() =>
    assertApprovable({ owner_executive_id: 'cto', due_date: null, review_date: '2026-06-20' }),
  );
});

// ---- approveWork: gate + decision + flip + stamp ----

test('approveWork: writes ceo_decisions, flips proposed→approved, stamps status_changed_at', async () => {
  const rec = recorder();
  const store = fakeStore(approvable(), rec, 'decision-xyz');
  const out = await approveWork(store, 'w1', { notes: 'from harness' });

  // ceo_decisions row written (the gate, AC1) with the work's own fields.
  assert.equal(rec.decisions.length, 1);
  assert.equal(rec.decisions[0]!.decisionTitle, 'Stand up staging');
  assert.equal(rec.decisions[0]!.owner, 'cto');
  assert.equal(rec.decisions[0]!.projectId, 'acme');
  assert.equal(rec.decisions[0]!.notes, 'from harness');

  // flip + stamp, with the SAME instant the result reports (AC13).
  assert.equal(rec.approved.length, 1);
  assert.deepEqual(rec.approved[0], { workId: 'w1', decisionId: 'decision-xyz', at: FIXED_NOW });
  assert.equal(out.statusChangedAt, FIXED_NOW);
  assert.equal(out.decisionId, 'decision-xyz');
});

test('approveWork: dateless work is rejected BEFORE any decision/flip write', async () => {
  const rec = recorder();
  const store = fakeStore(approvable({ dueDate: null, reviewDate: null }), rec);
  await assert.rejects(approveWork(store, 'w1'), (e: unknown) => e instanceof NeedsCeoCompletionError);
  assert.equal(rec.decisions.length, 0, 'no ceo_decisions written');
  assert.equal(rec.approved.length, 0, 'no flip');
});

test('approveWork: non-proposed work is not re-approved (idempotent guard)', async () => {
  const rec = recorder();
  const store = fakeStore(approvable({ approvalStatus: 'approved' }), rec);
  await assert.rejects(approveWork(store, 'w1'), /not awaiting approval/);
  assert.equal(rec.decisions.length, 0);
});

test('approveWork: missing row throws', async () => {
  const rec = recorder();
  const store = fakeStore(null, rec);
  await assert.rejects(approveWork(store, 'nope'), /not found/);
});

// ---- rejectWork / setWorkExecutionStatus always stamp ----

test('rejectWork: stamps status_changed_at', async () => {
  const rec = recorder();
  const out = await rejectWork(fakeStore(approvable(), rec), 'w1');
  assert.deepEqual(rec.rejected[0], { workId: 'w1', at: FIXED_NOW });
  assert.equal(out.statusChangedAt, FIXED_NOW);
});

test('setWorkExecutionStatus: always stamps status_changed_at and passes expectFrom', async () => {
  const rec = recorder();
  const out = await setWorkExecutionStatus(fakeStore(approvable(), rec), 'w1', 'in_progress', {
    expectFrom: 'open',
  });
  assert.deepEqual(rec.executions[0], {
    workId: 'w1',
    to: 'in_progress',
    at: FIXED_NOW,
    expectFrom: 'open',
  });
  assert.equal(out.statusChangedAt, FIXED_NOW);
});

// ---- assembleAttentionQueue (AC12) ----

function srcRow(over: Partial<AttentionSourceRow> = {}): AttentionSourceRow {
  return {
    id: 'w',
    projectSlug: 'acme',
    sourceType: 'directive',
    sourceId: 'd1',
    ownerExecutiveId: 'cto',
    title: 't',
    priority: 'P2',
    approvalStatus: 'approved',
    executionStatus: 'open',
    dueDate: null,
    reviewDate: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    statusChangedAt: '2026-06-07T00:00:00.000Z',
    ...over,
  };
}

test('assembleAttentionQueue: keeps only attention states, drops on-track work', () => {
  const now = '2026-06-09T00:00:00.000Z';
  const rows: AttentionSourceRow[] = [
    srcRow({ id: 'needs', approvalStatus: 'proposed' }), // needs_ceo_completion
    srcRow({ id: 'blocked', executionStatus: 'blocked' }), // blocked
    srcRow({ id: 'ontrack', executionStatus: 'in_progress', dueDate: '2026-12-31' }), // in_progress → dropped
    srcRow({ id: 'done', executionStatus: 'done' }), // dropped
  ];
  const out = assembleAttentionQueue(rows, new Set(), now);
  assert.deepEqual(out.map((i) => i.id).sort(), ['blocked', 'needs']);
});

test('assembleAttentionQueue: awaiting-CEO-input set promotes a row into the queue', () => {
  const now = '2026-06-09T00:00:00.000Z';
  const rows = [srcRow({ id: 'w7', executionStatus: 'in_progress', dueDate: '2026-12-31' })];
  // Without the awaiting flag this row is on-track (dropped); with it, it surfaces.
  assert.equal(assembleAttentionQueue(rows, new Set(), now).length, 0);
  const out = assembleAttentionQueue(rows, new Set(['w7']), now);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.state, 'awaiting_ceo_input');
});

test('assembleAttentionQueue: orders by priority then days-in-state', () => {
  const now = '2026-06-09T00:00:00.000Z';
  const rows: AttentionSourceRow[] = [
    srcRow({ id: 'p2-old', approvalStatus: 'proposed', priority: 'P2', statusChangedAt: '2026-06-01T00:00:00.000Z' }),
    srcRow({ id: 'p1', approvalStatus: 'proposed', priority: 'P1', statusChangedAt: '2026-06-08T00:00:00.000Z' }),
    srcRow({ id: 'p2-new', approvalStatus: 'proposed', priority: 'P2', statusChangedAt: '2026-06-08T00:00:00.000Z' }),
  ];
  const out = assembleAttentionQueue(rows, new Set(), now);
  assert.deepEqual(out.map((i) => i.id), ['p1', 'p2-old', 'p2-new']);
});
