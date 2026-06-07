import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  CreateEvidenceTokenInput,
  EvidenceKind,
  EvidenceTier,
  EvidenceToken,
  Task,
} from '@ai-company/shared-types';
import {
  evaluateCompletionGate,
  tierForKind,
  validateCreateEvidenceInput,
  validateEvidencePayload,
} from '../src/completion-gate.js';

/**
 * EVIDENCE_KIND_TIER is exported from @ai-company/shared-types as a const.
 * To keep this test runnable via `node --test` (which can't resolve the
 * extension-less ESM chain inside shared-types at runtime), we inline the
 * expected mapping here. Drift between this and the real const is caught by
 * the dedicated test below.
 */
const EXPECTED_KIND_TIER: Record<EvidenceKind, EvidenceTier> = {
  manual_note: 'E0',
  other: 'E0',
  human_attestation: 'E1',
  screenshot: 'E2',
  meeting_held: 'E2',
  document_produced: 'E2',
  message_sent: 'E3',
  metric_snapshot: 'E4',
};

function task(over: Partial<Task['evidenceRequired']> = {}): Task {
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
      minTier: over.minTier ?? 'E2',
      requiredKinds: over.requiredKinds ?? [],
      minCount: over.minCount ?? 1,
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
  extras: Partial<EvidenceToken> = {},
): EvidenceToken {
  const base = {
    id,
    taskId: 't1',
    createdAt: '',
    createdBy: 'op',
    kind,
    payload: {},
    signedBy: null,
    verifiedAt: null,
    validatorVersion: null,
    sourceKind: 'manual' as const,
    sourceRef: null,
    evidenceKind: 'screenshot' as const,
    evidenceHash: null,
  };
  if (tier === 'E1') {
    return {
      ...base,
      tier: 'E1',
      evidenceKind: 'human_attestation',
      overrideReason: 'because',
      approvedBy: 'ceo',
      ...extras,
    } as EvidenceToken;
  }
  return {
    ...base,
    tier,
    overrideReason: null,
    approvedBy: null,
    ...extras,
  } as EvidenceToken;
}

// ----- evaluateCompletionGate -----

test('gate: ready=true when validator approves', () => {
  const result = evaluateCompletionGate(task(), [tok('1', 'E2', 'screenshot')]);
  assert.equal(result.ready, true);
  assert.deepEqual(result.reasons, []);
});

test('gate: ready=false with reasons when no tokens', () => {
  const result = evaluateCompletionGate(task(), []);
  assert.equal(result.ready, false);
  assert.ok(result.reasons.length >= 1);
});

test('gate: ready=false when tokens below required tier', () => {
  const result = evaluateCompletionGate(task({ minTier: 'E3' }), [tok('1', 'E0', 'manual_note')]);
  assert.equal(result.ready, false);
  assert.ok(result.reasons.some((r) => r.includes('E3')));
});

// ----- tierForKind -----

test('tierForKind: matches expected EVIDENCE_KIND_TIER mapping', () => {
  for (const [k, expected] of Object.entries(EXPECTED_KIND_TIER) as Array<
    [EvidenceKind, EvidenceTier]
  >) {
    assert.equal(tierForKind(k), expected, `kind=${k} tier mismatch`);
  }
});

// ----- payload validators -----

test('payload: manual_note rejects empty text', () => {
  const r = validateEvidencePayload('manual_note', { text: '', author: 'op' });
  assert.equal(r.valid, false);
});

test('payload: manual_note accepts text + author', () => {
  const r = validateEvidencePayload('manual_note', { text: 'hi', author: 'op' });
  assert.equal(r.valid, true);
});

test('payload: screenshot requires url + ISO capturedAt', () => {
  assert.equal(validateEvidencePayload('screenshot', { url: 'u' }).valid, false);
  assert.equal(
    validateEvidencePayload('screenshot', { url: 'u', capturedAt: 'yesterday' }).valid,
    false,
  );
  assert.equal(
    validateEvidencePayload('screenshot', {
      url: 'https://x',
      capturedAt: '2026-06-05T12:00:00Z',
    }).valid,
    true,
  );
});

test('payload: meeting_held requires attendees + duration + heldAt', () => {
  assert.equal(
    validateEvidencePayload('meeting_held', {
      attendees: [],
      durationMinutes: 30,
      heldAt: '2026-06-05T10:00:00Z',
    }).valid,
    false,
  );
  assert.equal(
    validateEvidencePayload('meeting_held', {
      attendees: ['a'],
      durationMinutes: 0,
      heldAt: '2026-06-05T10:00:00Z',
    }).valid,
    false,
  );
  assert.equal(
    validateEvidencePayload('meeting_held', {
      attendees: ['a'],
      durationMinutes: 30,
      heldAt: '2026-06-05T10:00:00Z',
    }).valid,
    true,
  );
});

test('payload: metric_snapshot requires name + finite value + ISO timestamp + source', () => {
  assert.equal(
    validateEvidencePayload('metric_snapshot', {
      metricName: 'x',
      value: 'NaN' as unknown as number,
      observedAt: '2026-06-05T10:00:00Z',
      source: 'connector:foodtruck-il',
    }).valid,
    false,
  );
  assert.equal(
    validateEvidencePayload('metric_snapshot', {
      metricName: 'verified_truck_owners',
      value: 12,
      observedAt: '2026-06-05T10:00:00Z',
      source: 'connector:foodtruck-il',
    }).valid,
    true,
  );
});

test('payload: other requires description AND proposedKind (classification debt)', () => {
  assert.equal(
    validateEvidencePayload('other', { description: 'something' }).valid,
    false,
  );
  assert.equal(
    validateEvidencePayload('other', {
      description: 'something happened',
      proposedKind: 'meeting_via_phone',
    }).valid,
    true,
  );
});

test('payload: human_attestation requires statement', () => {
  assert.equal(validateEvidencePayload('human_attestation', {}).valid, false);
  assert.equal(
    validateEvidencePayload('human_attestation', { statement: 'I confirm X happened' }).valid,
    true,
  );
});

// ----- validateCreateEvidenceInput composite checks -----

test('create-input: rejects empty createdBy', () => {
  const input: CreateEvidenceTokenInput = {
    evidenceKind: 'manual_note',
    payload: { text: 'x', author: 'op' },
    sourceKind: 'manual',
    createdBy: '',
  };
  const r = validateCreateEvidenceInput(input);
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((s) => s.includes('createdBy')));
});

test('create-input: human_attestation without overrideReason/approvedBy rejected', () => {
  const input: CreateEvidenceTokenInput = {
    evidenceKind: 'human_attestation',
    payload: { statement: 'X happened' },
    sourceKind: 'manual',
    createdBy: 'op',
  };
  const r = validateCreateEvidenceInput(input);
  assert.equal(r.valid, false);
  assert.ok(r.reasons.some((s) => s.includes('overrideReason')));
});

test('create-input: human_attestation with both override fields accepted', () => {
  const input: CreateEvidenceTokenInput = {
    evidenceKind: 'human_attestation',
    payload: { statement: 'X happened' },
    sourceKind: 'manual',
    createdBy: 'op',
    overrideReason: 'no system-of-record exists for this',
    approvedBy: 'ceo',
  };
  const r = validateCreateEvidenceInput(input);
  assert.equal(r.valid, true);
});

test('create-input: kind-payload mismatch rejected (manual_note missing text)', () => {
  const input: CreateEvidenceTokenInput = {
    evidenceKind: 'manual_note',
    payload: { author: 'op' },
    sourceKind: 'manual',
    createdBy: 'op',
  };
  const r = validateCreateEvidenceInput(input);
  assert.equal(r.valid, false);
});
