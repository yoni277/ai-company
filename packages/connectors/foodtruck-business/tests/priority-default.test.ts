import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isKnownPriority } from '@ai-company/shared-types';
import { DEFAULT_PRIORITY, instancePriority } from '../src/decision-support-adapter';

// P1-3 — first real tests for the instance connector's priority default.
// The defect: scattered bare `'P2'` literals (decision-support-adapter.ts:65,80,95)
// silently defaulted. The fix makes the default EXPLICIT (a named constant) and
// routes elevation through a validated helper.

test('the instance default priority is explicit, named, and a known priority', () => {
  assert.equal(DEFAULT_PRIORITY, 'P2');
  assert.ok(isKnownPriority(DEFAULT_PRIORITY), 'default must be a known priority');
});

test('instancePriority elevates explicitly to P1, else the named default', () => {
  assert.equal(instancePriority(true), 'P1', 'a measured signal elevates to P1');
  assert.equal(instancePriority(false), DEFAULT_PRIORITY, 'no signal → the explicit instance default');
  // Never an unknown priority leaves the connector.
  assert.ok(isKnownPriority(instancePriority(true)));
  assert.ok(isKnownPriority(instancePriority(false)));
});
