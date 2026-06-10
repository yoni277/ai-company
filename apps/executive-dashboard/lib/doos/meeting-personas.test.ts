import { test } from 'node:test';
import assert from 'node:assert/strict';
import type Anthropic from '@anthropic-ai/sdk';
import { callInstructionResponse } from './meeting-personas';

/** A fake Anthropic client that records the `system` it was given and returns a canned tool_use. */
function fakeClient(capture: { system?: string }): Anthropic {
  return {
    messages: {
      create: async (args: { system: string }) => {
        capture.system = args.system;
        return {
          content: [
            { type: 'tool_use', name: 'respond_to_instruction', input: { needs_ceo_input: false, response: 'ok' } },
          ],
        };
      },
    },
  } as unknown as Anthropic;
}

test('callInstructionResponse: no systemSuffix → byte-identical persona system (flag-off path)', async () => {
  const cap: { system?: string } = {};
  const r = await callInstructionResponse(fakeClient(cap), 'cto', 'do the thing');
  assert.equal(r.response, 'ok');
  assert.equal(r.needsCeoInput, false);
  assert.ok(cap.system && cap.system.length > 0, 'a persona system prompt is sent');
  assert.ok(!cap.system!.includes('COMPANY CONTEXT'), 'no context injected when no suffix');
});

test('callInstructionResponse: systemSuffix is appended to the persona system (Layer 1)', async () => {
  const SUFFIX = 'COMPANY CONTEXT — Acme\nFACTS:\n  - Business: Acme';
  const base: { system?: string } = {};
  await callInstructionResponse(fakeClient(base), 'cto', 'do the thing');
  const withSuffix: { system?: string } = {};
  await callInstructionResponse(fakeClient(withSuffix), 'cto', 'do the thing', SUFFIX);

  // Exactly the base persona system + a blank line + the suffix — nothing else changed.
  assert.equal(withSuffix.system, `${base.system}\n\n${SUFFIX}`);
  assert.ok(withSuffix.system!.endsWith(SUFFIX));
});
