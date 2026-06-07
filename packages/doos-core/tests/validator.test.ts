import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EvidenceToken, Task } from '@ai-company/shared-types';
import { validateEvidenceForTask } from '../src/validator.js';

function task(req: Partial<Task['evidenceRequired']> = {}): Task {
  return {
    id: 't1',
    createdAt: '',
    updatedAt: '',
    objectiveId: 'o1',
    directiveId: null,
    title: 'x',
    description: null,
    capabilityRequired: 'noop',
    ownerId: null,
    status: 'pending',
    evidenceRequired: {
      minTier: req.minTier ?? 'E2',
      requiredKinds: req.requiredKinds ?? [],
      minCount: req.minCount ?? 1,
    },
    dueAt: null,
    completedAt: null,
    completedBy: null,
    proposalId: null,
  };
}

function tok(
  id: string,
  tier: EvidenceToken['tier'],
  kind: string,
  overrides: Partial<EvidenceToken> = {},
): EvidenceToken {
  const base = {
    id,
    taskId: 't1',
    createdAt: '',
    createdBy: null,
    kind,
    payload: {},
    signedBy: null,
    verifiedAt: null,
    validatorVersion: null,
  };
  if (tier === 'E1') {
    return {
      ...base,
      tier,
      overrideReason: 'reason',
      approvedBy: 'CEO',
      ...overrides,
    } as EvidenceToken;
  }
  return {
    ...base,
    tier,
    overrideReason: null,
    approvedBy: null,
    ...overrides,
  } as EvidenceToken;
}

test('empty token list fails minCount=1', () => {
  const r = validateEvidenceForTask(task(), []);
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((x) => x.includes('minCount=1 not met')));
});

test('single E2 token satisfies default requirement', () => {
  const r = validateEvidenceForTask(task(), [tok('a', 'E2', 'artifact')]);
  assert.equal(r.valid, true);
  assert.deepEqual(r.reasons, []);
});

test('E0 token does not satisfy minTier=E2', () => {
  const r = validateEvidenceForTask(task(), [tok('a', 'E0', 'assertion')]);
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((x) => x.includes('minTier=E2')));
});

test('E4 always exceeds minTier=E2', () => {
  const r = validateEvidenceForTask(task(), [tok('a', 'E4', 'measured')]);
  assert.equal(r.valid, true);
});

test('requiredKinds enforces presence of every named kind', () => {
  const r = validateEvidenceForTask(
    task({ requiredKinds: ['artifact', 'measurement'] }),
    [tok('a', 'E2', 'artifact')],
  );
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((x) => x.includes('measurement')));
});

test('all requiredKinds present passes', () => {
  const r = validateEvidenceForTask(
    task({ requiredKinds: ['artifact', 'measurement'], minCount: 2 }),
    [tok('a', 'E2', 'artifact'), tok('b', 'E4', 'measurement')],
  );
  assert.equal(r.valid, true);
});

test('minCount counts only tokens at/above minTier', () => {
  // minTier=E3, minCount=2; supplied 1 E3 + 1 E1 → only 1 at/above
  const r = validateEvidenceForTask(
    task({ minTier: 'E3', minCount: 2 }),
    [tok('a', 'E3', 'mutation'), tok('b', 'E1', 'attest')],
  );
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((x) => x.includes('minTier=E3')));
});

test('E1 token without overrideReason is malformed and excluded', () => {
  const malformed = {
    ...tok('a', 'E1', 'attest'),
    overrideReason: '',
  } as EvidenceToken;
  const r = validateEvidenceForTask(task({ minTier: 'E1' }), [malformed]);
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((x) => x.includes('missing overrideReason')));
});

test('E1 token without approvedBy is malformed and excluded', () => {
  const malformed = {
    ...tok('a', 'E1', 'attest'),
    approvedBy: '',
  } as EvidenceToken;
  const r = validateEvidenceForTask(task({ minTier: 'E1' }), [malformed]);
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((x) => x.includes('approvedBy')));
});

test('properly formed E1 token satisfies minTier=E1 with default minCount=1', () => {
  const r = validateEvidenceForTask(task({ minTier: 'E1' }), [
    tok('a', 'E1', 'attest'),
  ]);
  assert.equal(r.valid, true);
});

test('validatorVersion is always returned', () => {
  const r = validateEvidenceForTask(task(), []);
  assert.equal(r.validatorVersion, '1');
});

test('multiple failure reasons are all surfaced', () => {
  const r = validateEvidenceForTask(
    task({ minTier: 'E3', requiredKinds: ['mutation'], minCount: 2 }),
    [tok('a', 'E0', 'assertion')],
  );
  assert.equal(r.valid, false);
  // expect at least 3 distinct reasons: minCount, requiredKinds, minTier
  assert.ok(r.reasons.length >= 3, `reasons: ${r.reasons.join('; ')}`);
});
