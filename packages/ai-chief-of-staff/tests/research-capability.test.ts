import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  ResearchCapability,
  ResearchQuery,
  ResearchResult,
} from '@ai-company/shared-types';
import {
  registerResearchCapability,
  getResearchCapability,
  listResearchCapabilities,
  __resetResearchCapabilities,
  RESEARCH_CAPABILITY,
} from '../src/research-capability.js';

function stub(name: string): ResearchCapability {
  return {
    name,
    async run(_q: ResearchQuery): Promise<ResearchResult> {
      return {
        query: _q.query,
        sources: [],
        cached: false,
        retrievedAt: new Date().toISOString(),
      };
    },
  };
}

test('registry starts empty', () => {
  __resetResearchCapabilities();
  assert.deepEqual(listResearchCapabilities(), []);
  assert.equal(getResearchCapability(), undefined);
});

test('register + lookup by default name', () => {
  __resetResearchCapabilities();
  const cap = stub(RESEARCH_CAPABILITY);
  registerResearchCapability(cap);
  assert.equal(getResearchCapability(), cap);
  assert.deepEqual(listResearchCapabilities(), [RESEARCH_CAPABILITY]);
});

test('register replaces previous registration for same name', () => {
  __resetResearchCapabilities();
  const a = stub('research');
  const b = stub('research');
  registerResearchCapability(a);
  registerResearchCapability(b);
  assert.equal(getResearchCapability(), b);
  assert.equal(getResearchCapability(), b);
});

test('lookup with unknown name returns undefined', () => {
  __resetResearchCapabilities();
  registerResearchCapability(stub('research'));
  assert.equal(getResearchCapability('tavily'), undefined);
});

test('multiple distinct backends co-exist', () => {
  __resetResearchCapabilities();
  registerResearchCapability(stub('research'));
  registerResearchCapability(stub('experimental'));
  assert.deepEqual(
    listResearchCapabilities().sort(),
    ['experimental', 'research'].sort(),
  );
});
