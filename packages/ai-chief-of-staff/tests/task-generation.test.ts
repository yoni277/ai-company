import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  CEODirective,
  DecideTaskProposalInput,
  ProposalStatus,
  TaskProposal,
  TaskProposalRecord,
  UpsertTaskProposalInput,
} from '@ai-company/shared-types';
import type { Repositories, TaskProposalRepository } from '@ai-company/database';
import {
  TASK_PROPOSAL_CAP_PER_DIRECTIVE,
  DEFAULT_PROPOSAL_TYPE,
  fingerprintProposal,
  planProposals,
  synthesizeDirectiveProposal,
  transformProposalsToProposals,
} from '../src/task-generation.js';

function directive(over: Partial<CEODirective> = {}): CEODirective {
  return {
    id: 'd1',
    createdAt: '2026-06-04T11:00:00.000Z',
    updatedAt: '2026-06-04T11:00:00.000Z',
    title: 't',
    directive: 'd',
    category: 'strategy',
    priority: 'medium',
    active: true,
    expiresAt: null,
    isOverride: false,
    targetProjectId: null,
    respondingExecutives: [],
    objectiveId: 'obj-1',
    ...over,
  };
}

function proposal(over: Partial<TaskProposal> = {}): TaskProposal {
  return {
    title: 'Default proposal title',
    capabilityRequired: 'send_message',
    ...over,
  };
}

/**
 * In-process TaskProposalRepository fake. Mirrors the contract of the
 * Supabase implementation: upsert by (directiveId, fingerprint) bumps
 * `generation` instead of creating a duplicate row.
 */
function fakeProposalRepo(): {
  repo: TaskProposalRepository;
  rows: TaskProposalRecord[];
} {
  const rows: TaskProposalRecord[] = [];
  const repo: TaskProposalRepository = {
    async listByDirective(directiveId: string) {
      return rows.filter((r) => r.directiveId === directiveId);
    },
    async listByStatus(status: ProposalStatus) {
      return rows.filter((r) => r.status === status);
    },
    async getById(id: string) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async upsert(input: UpsertTaskProposalInput): Promise<TaskProposalRecord> {
      const existing = rows.find(
        (r) => r.directiveId === input.directiveId && r.fingerprint === input.fingerprint,
      );
      if (existing) {
        existing.generation += 1;
        existing.payload = input.payload;
        existing.proposalType = input.proposalType;
        existing.sourceExecutiveId = input.sourceExecutiveId;
        existing.updatedAt = new Date().toISOString();
        return existing;
      }
      const rec: TaskProposalRecord = {
        id: `proposal-${rows.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        directiveId: input.directiveId,
        sourceExecutiveId: input.sourceExecutiveId,
        proposalType: input.proposalType,
        fingerprint: input.fingerprint,
        payload: input.payload,
        status: 'proposed',
        generation: 1,
        decidedAt: null,
        decidedBy: null,
      };
      rows.push(rec);
      return rec;
    },
    async decide(id: string, input: DecideTaskProposalInput) {
      const r = rows.find((x) => x.id === id);
      if (!r) throw new Error(`not found ${id}`);
      r.status = input.status;
      r.decidedAt = new Date().toISOString();
      r.decidedBy = input.decidedBy;
      r.updatedAt = r.decidedAt;
      return r;
    },
  };
  return { repo, rows };
}

function fakeRepos(): { repos: Repositories; rows: TaskProposalRecord[] } {
  const { repo, rows } = fakeProposalRepo();
  const repos = { taskProposals: repo } as unknown as Repositories;
  return { repos, rows };
}

// ----- planProposals (pure) -----

test('planProposals: empty list → skipped-no-proposals', () => {
  const r = planProposals({ proposals: [], objectiveId: 'obj-1' });
  assert.equal(r.skipReason, 'no-proposals');
  assert.deepEqual(r.accepted, []);
});

test('planProposals: undefined → skipped-no-proposals', () => {
  const r = planProposals({ proposals: undefined, objectiveId: 'obj-1' });
  assert.equal(r.skipReason, 'no-proposals');
});

test('planProposals: null objective → skipped-no-objective', () => {
  const r = planProposals({ proposals: [proposal()], objectiveId: null });
  assert.equal(r.skipReason, 'no-objective');
});

test('planProposals: caps at TASK_PROPOSAL_CAP_PER_DIRECTIVE', () => {
  const r = planProposals({
    proposals: Array.from({ length: 5 }, (_, i) => proposal({ title: `P${i}` })),
    objectiveId: 'obj-1',
  });
  assert.equal(r.accepted.length, TASK_PROPOSAL_CAP_PER_DIRECTIVE);
  assert.equal(r.rejected.length, 5 - TASK_PROPOSAL_CAP_PER_DIRECTIVE);
  assert.ok(r.rejected.every((x) => x.reason === 'cap-exceeded'));
});

test('planProposals: rejects malformed proposals individually', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bad: any[] = [
    { capabilityRequired: 'x' },
    { title: 'ok', capabilityRequired: '' },
    proposal({ title: 'good' }),
    { title: 'bad-due', capabilityRequired: 'x', dueInDays: -1 },
    { title: 'bad-prio', capabilityRequired: 'x', priority: 'urgent' },
    { title: 'bad-type', capabilityRequired: 'x', proposalType: 'investigate' },
  ];
  const r = planProposals({ proposals: bad, objectiveId: 'obj-1' });
  assert.equal(r.accepted.length, 1);
  assert.deepEqual(
    r.rejected.map((x) => x.reason).sort(),
    [
      'invalid-dueInDays',
      'invalid-priority',
      'invalid-proposal-type',
      'missing-capability-required',
      'missing-title',
    ].sort(),
  );
});

test('planProposals: well-formed proposal incl. proposalType is accepted', () => {
  const r = planProposals({
    proposals: [
      proposal({
        title: 'do x',
        proposalType: 'research',
        priority: 'high',
        dueInDays: 3,
      }),
    ],
    objectiveId: 'obj-1',
  });
  assert.equal(r.accepted.length, 1);
  assert.equal(r.accepted[0]!.proposalType, 'research');
});

// ----- fingerprintProposal -----

test('fingerprint: identical inputs produce identical hashes', () => {
  const a = fingerprintProposal({
    directiveId: 'd1',
    sourceExecutiveId: 'vp-marketing',
    proposalType: 'action',
    title: 'Launch email campaign',
    capabilityRequired: 'send_message',
  });
  const b = fingerprintProposal({
    directiveId: 'd1',
    sourceExecutiveId: 'vp-marketing',
    proposalType: 'action',
    title: '  Launch  email   CAMPAIGN  ', // whitespace + case normalized
    capabilityRequired: 'send_message',
  });
  assert.equal(a, b);
});

test('fingerprint: different proposal_type yields different hash', () => {
  const action = fingerprintProposal({
    directiveId: 'd1',
    sourceExecutiveId: 'vp-marketing',
    proposalType: 'action',
    title: 'Investigate competitor',
    capabilityRequired: 'analyze_market',
  });
  const research = fingerprintProposal({
    directiveId: 'd1',
    sourceExecutiveId: 'vp-marketing',
    proposalType: 'research',
    title: 'Investigate competitor',
    capabilityRequired: 'analyze_market',
  });
  assert.notEqual(action, research);
});

// ----- transformProposalsToProposals -----

test('transform: missing objective → skipped, no writes', async () => {
  const { repos, rows } = fakeRepos();
  const out = await transformProposalsToProposals(repos, {
    directive: directive({ objectiveId: null }),
    sourceExecutiveId: 'vp-marketing',
    proposals: [proposal()],
  });
  assert.equal(out.kind, 'skipped-no-objective');
  assert.equal(rows.length, 0);
});

test('transform: empty proposals → skipped, no writes', async () => {
  const { repos, rows } = fakeRepos();
  const out = await transformProposalsToProposals(repos, {
    directive: directive(),
    sourceExecutiveId: 'vp-marketing',
    proposals: [],
  });
  assert.equal(out.kind, 'skipped-no-proposals');
  assert.equal(rows.length, 0);
});

test('transform: writes proposed status, defaults proposalType to action', async () => {
  const { repos, rows } = fakeRepos();
  const out = await transformProposalsToProposals(repos, {
    directive: directive(),
    sourceExecutiveId: 'cfo',
    proposals: [proposal()],
  });
  assert.equal(out.kind, 'persisted');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.status, 'proposed');
  assert.equal(rows[0]!.proposalType, DEFAULT_PROPOSAL_TYPE);
});

test('transform: caps at TASK_PROPOSAL_CAP_PER_DIRECTIVE', async () => {
  const { repos, rows } = fakeRepos();
  const out = await transformProposalsToProposals(repos, {
    directive: directive(),
    sourceExecutiveId: 'coo',
    proposals: Array.from({ length: 7 }, (_, i) => proposal({ title: `T${i}` })),
  });
  assert.equal(out.kind, 'persisted');
  assert.equal(rows.length, TASK_PROPOSAL_CAP_PER_DIRECTIVE);
});

test('transform: rerun with identical proposal bumps generation, does NOT duplicate', async () => {
  const { repos, rows } = fakeRepos();
  const props = [proposal({ title: 'Send WhatsApp blast', capabilityRequired: 'send_message' })];
  const first = await transformProposalsToProposals(repos, {
    directive: directive(),
    sourceExecutiveId: 'vp-marketing',
    proposals: props,
  });
  assert.equal(first.kind, 'persisted');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.generation, 1);

  const second = await transformProposalsToProposals(repos, {
    directive: directive(),
    sourceExecutiveId: 'vp-marketing',
    proposals: props,
  });
  assert.equal(second.kind, 'persisted');
  assert.equal(rows.length, 1, 'no duplicate row');
  assert.equal(rows[0]!.generation, 2, 'generation bumped');
});

// ----- EPIC-004A synthesize fallback -----

test('synthesizeDirectiveProposal: valid, no fabricated deadline', () => {
  const p = synthesizeDirectiveProposal(directive({ title: 'Ship staging pipeline' }));
  assert.equal(p.title, 'Ship staging pipeline');
  assert.ok(p.capabilityRequired.length > 0);
  assert.equal(p.dueInDays, undefined, 'no invented deadline');
  assert.equal(p.priority, undefined, 'no invented priority');
});

test('transform: synthesizeFallback + empty proposals → persists 1 synthesized row', async () => {
  const { repos, rows } = fakeRepos();
  const out = await transformProposalsToProposals(repos, {
    directive: directive(),
    sourceExecutiveId: 'cto',
    proposals: [],
    synthesizeFallback: true,
  });
  assert.equal(out.kind, 'persisted');
  assert.equal(out.kind === 'persisted' && out.synthesized, true);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.status, 'proposed');
});

test('transform: synthesizeFallback + all-malformed proposals → still lands 1 synthesized', async () => {
  const { repos, rows } = fakeRepos();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bad: any[] = [{ description: 'prose only, no title/capability' }];
  const out = await transformProposalsToProposals(repos, {
    directive: directive(),
    sourceExecutiveId: 'cto',
    proposals: bad,
    synthesizeFallback: true,
  });
  assert.equal(out.kind, 'persisted');
  assert.equal(rows.length, 1, 'a directive never silently vanishes');
});

test('transform: synthesizeFallback does NOT override the no-objective governance lock', async () => {
  const { repos, rows } = fakeRepos();
  const out = await transformProposalsToProposals(repos, {
    directive: directive({ objectiveId: null }),
    sourceExecutiveId: 'cto',
    proposals: [],
    synthesizeFallback: true,
  });
  assert.equal(out.kind, 'skipped-no-objective');
  assert.equal(rows.length, 0);
});

test('transform: without the flag, empty proposals still skip (back-compat)', async () => {
  const { repos, rows } = fakeRepos();
  const out = await transformProposalsToProposals(repos, {
    directive: directive(),
    sourceExecutiveId: 'cto',
    proposals: [],
  });
  assert.equal(out.kind, 'skipped-no-proposals');
  assert.equal(rows.length, 0);
});

test('transform: different proposalType for same title → two distinct rows', async () => {
  const { repos, rows } = fakeRepos();
  await transformProposalsToProposals(repos, {
    directive: directive(),
    sourceExecutiveId: 'vp-marketing',
    proposals: [
      proposal({ title: 'Investigate competitor', proposalType: 'action' }),
      proposal({ title: 'Investigate competitor', proposalType: 'research' }),
    ],
  });
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0]!.fingerprint, rows[1]!.fingerprint);
});
