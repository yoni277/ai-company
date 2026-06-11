import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePriority,
  priorityRank,
  auditPriorities,
  isKnownPriority,
  INVALID_PRIORITY_RANK,
  KNOWN_PRIORITIES,
  type RecommendedAction,
} from '@ai-company/shared-types';
import { sortActions } from '@ai-company/decision-support-engine';

// P1-3 — these are the first real tests for the priority-integrity boundary.
// The defect: an unknown priority hit a Record<Priority,number> lookup → undefined
// → silent NaN in the sort comparator (silent mis-rank). The fix routes every
// ranking through validatePriority/priorityRank: deterministic, explicit, audited.

// ---- valid priorities rank deterministically ----
test('known priorities rank deterministically P1<P2<P3', () => {
  assert.equal(priorityRank('P1'), 0);
  assert.equal(priorityRank('P2'), 1);
  assert.equal(priorityRank('P3'), 2);
  assert.ok(priorityRank('P1') < priorityRank('P2'));
  assert.ok(priorityRank('P2') < priorityRank('P3'));
  for (const p of KNOWN_PRIORITIES) assert.ok(validatePriority(p).ok);
});

// ---- unknown priority → EXPLICIT validation, not silent P2 / NaN ----
test('unknown priority is validated/rejected explicitly (not coerced, never NaN)', () => {
  const res = validatePriority('P9');
  assert.equal(res.ok, false);
  assert.match(res.reason ?? '', /invalid-priority/);
  // deterministic rank — explicit, sorts after every valid one, never NaN, never silent 99
  assert.equal(res.rank, INVALID_PRIORITY_RANK);
  assert.equal(res.rank, KNOWN_PRIORITIES.length);
  assert.ok(Number.isFinite(res.rank));
  assert.ok(res.rank > priorityRank('P3'), 'invalid sorts strictly after P3');
  // it is NOT silently coerced to P2
  assert.notEqual(res.rank, priorityRank('P2'));
});

test('priorityRank never returns NaN for any input', () => {
  for (const v of ['P1', 'P2', 'P3', 'P0', 'urgent', '', 'p1', undefined, null, 42, {}]) {
    assert.ok(Number.isFinite(priorityRank(v as unknown)), `rank for ${String(v)} is finite`);
  }
  assert.equal(isKnownPriority('p1'), false, 'case-sensitive: lowercase is not known');
});

// ---- audit trail: invalid priorities surface as explicit warning entries ----
test('auditPriorities returns an explicit entry for each invalid priority', () => {
  const warnings = auditPriorities([
    { priority: 'P1', label: 'a' },
    { priority: 'P9', label: 'bad-one' },
    { priority: '', label: 'empty' },
  ]);
  assert.equal(warnings.length, 2, 'only the two invalid ones are audited');
  assert.match(warnings[0]!, /invalid-priority.*bad-one/);
  assert.match(warnings[1]!, /invalid-priority.*empty/);
});

// ---- engine boundary: sortActions is deterministic even with an invalid value ----
function action(over: Partial<RecommendedAction> = {}): RecommendedAction {
  return {
    id: 'x',
    projectId: 'proj',
    projectName: 'Proj',
    priority: 'P2',
    category: 'operations',
    title: 't',
    reason: 'r',
    expectedImpact: 'i',
    source: 'system:test',
    requiresApproval: false,
    ...over,
  } as RecommendedAction;
}

test('sortActions ranks deterministically and never NaN, invalid priority sorts last', () => {
  // Force a runtime-invalid priority (the type says P1|P2|P3, but real data can violate it).
  const bad = action({ id: 'bad', title: 'bad', priority: 'P9' as unknown as RecommendedAction['priority'] });
  const p1 = action({ id: 'p1', title: 'p1', priority: 'P1' });
  const p3 = action({ id: 'p3', title: 'p3', priority: 'P3' });

  const sorted = sortActions([bad, p3, p1]);
  assert.deepEqual(
    sorted.map((a) => a.id),
    ['p1', 'p3', 'bad'],
    'P1 first, P3 next, invalid last — deterministic, no NaN scrambling',
  );

  // Stable / deterministic across input orderings.
  const sorted2 = sortActions([p1, bad, p3]);
  assert.deepEqual(sorted.map((a) => a.id), sorted2.map((a) => a.id));
});
