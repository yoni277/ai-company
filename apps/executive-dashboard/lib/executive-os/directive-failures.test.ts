import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  selectDirectiveFanoutFailures,
  countResponderFailures,
  type DirectiveForFailure,
  type ResponseForFailure,
} from './directive-failures-core';

const D: DirectiveForFailure[] = [
  { id: 'd1', title: 'Automations market research', active: true },
  { id: 'd2', title: 'Closed directive', active: false },
];

function resp(over: Partial<ResponseForFailure> = {}): ResponseForFailure {
  return {
    directiveId: 'd1',
    executiveId: 'vp-marketing',
    status: 'done',
    errorMessage: null,
    executiveReportId: 'r1',
    ...over,
  };
}

// OF-011 / D085 item 6 — the core guarantee: an errored responder is NEVER silent.
test('errored responder on an active directive surfaces as a signal', () => {
  const out = selectDirectiveFanoutFailures(D, [
    resp({ executiveId: 'cto', status: 'done', executiveReportId: 'r1' }),
    resp({ executiveId: 'vp-marketing', status: 'error', errorMessage: 'timeout', executiveReportId: null }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.directiveId, 'd1');
  assert.equal(out[0]!.failures.length, 1);
  assert.equal(out[0]!.failures[0]!.executiveId, 'vp-marketing');
  assert.equal(out[0]!.failures[0]!.errorMessage, 'timeout');
  assert.equal(countResponderFailures(out), 1);
});

test('all-done directive produces no signal (no false positives)', () => {
  const out = selectDirectiveFanoutFailures(D, [
    resp({ executiveId: 'cto', status: 'done' }),
    resp({ executiveId: 'vp-marketing', status: 'done' }),
  ]);
  assert.deepEqual(out, []);
  assert.equal(countResponderFailures(out), 0);
});

test('pending/running responders are not failures', () => {
  const out = selectDirectiveFanoutFailures(D, [
    resp({ status: 'pending', executiveReportId: null }),
    resp({ status: 'running', executiveReportId: null }),
  ]);
  assert.deepEqual(out, []);
});

test('an error on an INACTIVE directive is not an open signal', () => {
  const out = selectDirectiveFanoutFailures(D, [
    resp({ directiveId: 'd2', status: 'error', errorMessage: 'boom', executiveReportId: null }),
  ]);
  assert.deepEqual(out, []);
});

test('multiple errored responders group under one directive', () => {
  const out = selectDirectiveFanoutFailures(D, [
    resp({ executiveId: 'cto', status: 'error', errorMessage: 'a', executiveReportId: null }),
    resp({ executiveId: 'vp-marketing', status: 'error', errorMessage: 'b', executiveReportId: null }),
    resp({ executiveId: 'coo', status: 'done' }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.failures.length, 2);
  assert.equal(countResponderFailures(out), 2);
});
