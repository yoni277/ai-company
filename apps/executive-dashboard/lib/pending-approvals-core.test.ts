import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  derivePendingApprovals,
  countPendingApprovals,
  type DecisionRecord,
  type ProposalRecord,
  type WorkRecord,
} from './pending-approvals-core';

function decision(over: Partial<DecisionRecord> = {}): DecisionRecord {
  return { id: 'd', title: 'decision', status: 'proposed', ...over };
}
function proposal(over: Partial<ProposalRecord> = {}): ProposalRecord {
  return { id: 'p', title: 'proposal', status: 'proposed', ...over };
}
function work(over: Partial<WorkRecord> = {}): WorkRecord {
  return { id: 'w', title: 'work', approvalStatus: 'proposed', sourceType: 'directive', ...over };
}

// ---- the count derives ONLY from the three structured sources ----
test('count = open decisions + proposed proposals + proposed work', () => {
  const out = derivePendingApprovals({
    decisions: [
      decision({ id: 'd1', status: 'proposed' }),
      decision({ id: 'd2', status: 'approved' }), // decided → not pending
      decision({ id: 'd3', status: 'rejected' }), // decided → not pending
    ],
    proposals: [
      proposal({ id: 'p1', status: 'proposed' }),
      proposal({ id: 'p2', status: 'approved' }), // promoted → not pending
    ],
    work: [
      work({ id: 'w1', approvalStatus: 'proposed' }),
      work({ id: 'w2', approvalStatus: 'approved' }), // approved → not pending
      work({ id: 'w3', approvalStatus: 'rejected' }), // rejected → not pending
    ],
  });
  // 1 open decision + 1 proposed proposal + 1 proposed work = 3
  assert.equal(out.length, 3);
  assert.deepEqual(
    out.map((i) => i.id),
    ['d1', 'p1', 'w1'],
  );
  assert.deepEqual(
    out.map((i) => i.source),
    ['ceo_decision', 'task_proposal', 'assigned_work:directive'],
  );
});

// ---- a risk whose TEXT says "approval" is NOT counted (the D8 defect) ----
test('free-text "approval"/"awaiting" never enters the count — risks are not a source', () => {
  // The old regex path counted a risk whose description matched
  // /approval|approve|pending review|awaiting/. The structured deriver takes no
  // risks/opportunities at all — descriptions cannot contribute.
  const out = derivePendingApprovals({
    decisions: [],
    proposals: [],
    work: [],
  });
  assert.equal(out.length, 0);

  // Even a record whose TITLE contains "awaiting approval" only counts when its
  // STRUCTURED status is the pending one — not because of the words.
  const decided = derivePendingApprovals({
    decisions: [decision({ id: 'd', title: 'Awaiting approval to proceed', status: 'approved' })],
    proposals: [],
    work: [],
  });
  assert.equal(decided.length, 0, 'decided record is not pending regardless of its words');
});

// ---- BEFORE/AFTER fixture: the audit win ----
test('before/after: a risk that mentions "approval" drops out of the count', () => {
  // BEFORE (the deleted regex path), reconstructed for the fixture:
  const oldApprovalPattern = /approval|approve|pending review|awaiting/i;
  const risks = [
    { id: 'r1', description: 'Vendor SLA needs approval before launch' }, // matched → counted
    { id: 'r2', description: 'Latency spike on checkout' }, // not matched
  ];
  const beforeCount = risks.filter((r) => oldApprovalPattern.test(r.description)).length;
  assert.equal(beforeCount, 1, 'BEFORE: the regex counted a risk description as a pending approval');

  // AFTER: the same risks contribute nothing; only structured records do.
  const afterCount = countPendingApprovals({
    decisions: [], // no open decision exists for that risk
    proposals: [],
    work: [],
  });
  assert.equal(afterCount, 0, 'AFTER: no structured record → not a pending approval');
  assert.notEqual(beforeCount, afterCount, 'the fix changes the count: text-match 1 → structured 0');
});

// ---- display-name resolver is display-only, never affects the count ----
test('projectName resolver decorates but does not gate', () => {
  const resolveName = (k: string | null | undefined) =>
    k === 'proj-1' ? 'Automation App' : undefined;
  const out = derivePendingApprovals({
    decisions: [decision({ id: 'd1', status: 'proposed', projectKey: 'proj-1' })],
    proposals: [],
    work: [work({ id: 'w1', approvalStatus: 'proposed', projectKey: 'missing' })],
    projectName: resolveName,
  });
  assert.equal(out.length, 2);
  assert.equal(out[0]!.projectName, 'Automation App');
  assert.equal(out[1]!.projectName, undefined, 'unresolved key → no projectName, still counted');
});

// ---- order stability (deterministic output) ----
test('output is order-stable: decisions → proposals → work', () => {
  const out = derivePendingApprovals({
    decisions: [decision({ id: 'd1' })],
    proposals: [proposal({ id: 'p1' })],
    work: [work({ id: 'w1' })],
  });
  assert.deepEqual(out.map((i) => i.id), ['d1', 'p1', 'w1']);
});
