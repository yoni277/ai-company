import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureOwnedWorkOrNoAction } from './meeting-conversion';
import type { SynthesisDecision, ExecutiveId } from './meeting-personas';

function dec(over: Partial<SynthesisDecision> = {}): SynthesisDecision {
  return {
    decision: 'Decide X',
    rationale: 'because Y',
    dissenting_opinions: [],
    actionable: false,
    owner_executive_id: null,
    work_title: '',
    work_detail: '',
    due_in_days: null,
    ...over,
  };
}
const MOD: ExecutiveId = 'chief-of-staff';

test('conversion: an owned actionable decision passes through untouched', () => {
  const decisions = [dec({ actionable: true, owner_executive_id: 'cto', work_title: 'Ship staging' })];
  const out = ensureOwnedWorkOrNoAction(decisions, 'summary', MOD, 'topic');
  assert.equal(out.synthesizedFallback, false);
  assert.equal(out.noAction, null);
  assert.equal(decisions.length, 1, 'no fallback appended');
});

test('conversion: all-non-actionable decisions → honest no-action (recorded, not silent)', () => {
  const decisions = [dec({ actionable: false, rationale: 'market not ready' })];
  const out = ensureOwnedWorkOrNoAction(decisions, 'summary', MOD, 'topic');
  assert.equal(out.synthesizedFallback, false);
  assert.ok(out.noAction);
  assert.match(out.noAction!.reason, /market not ready/);
  assert.equal(decisions.length, 1, 'no fabricated work');
});

test('conversion: actionable but unowned → synthesize ONE owned next step (no silent stall)', () => {
  const decisions = [dec({ actionable: true, owner_executive_id: null, decision: 'Gather the shortlist' })];
  const out = ensureOwnedWorkOrNoAction(decisions, 'summary', MOD, 'topic');
  assert.equal(out.synthesizedFallback, true);
  assert.equal(out.noAction, null);
  assert.equal(decisions.length, 2);
  const added = decisions[1]!;
  assert.equal(added.actionable, true);
  assert.equal(added.owner_executive_id, MOD);
  assert.equal(added.due_in_days, null, 'no fabricated deadline');
  assert.match(added.work_title, /shortlist/i);
});

test('conversion: no decisions at all → synthesize a fallback owned next step', () => {
  const decisions: SynthesisDecision[] = [];
  const out = ensureOwnedWorkOrNoAction(decisions, 'we discussed but produced nothing', MOD, 'Pricing model');
  assert.equal(out.synthesizedFallback, true);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0]!.owner_executive_id, MOD);
  assert.match(decisions[0]!.work_title, /Pricing model/);
});

test('conversion: preserves dissent (D076) — does not fabricate consensus', () => {
  const decisions = [dec({ actionable: true, owner_executive_id: null, dissenting_opinions: ['CFO disagrees on cost'] })];
  ensureOwnedWorkOrNoAction(decisions, 'summary', MOD, 'topic');
  assert.deepEqual(decisions[1]!.dissenting_opinions, ['CFO disagrees on cost']);
});
