/**
 * L30 proof harness — DRY RUN (engine proof, no DB writes).
 *
 * Runs the SAME orchestrator (lib/doos/meeting-orchestrator.ts) against live
 * Anthropic, but with an in-memory store and a local meeting id — it touches NO
 * shared database (honors the CLAUDE.md "no shared-DB writes" boundary). It
 * proves the D076 gate: real challenge protocol (position → challenge → rebuttal
 * → synthesis → proposed work). The printed `discussion` and `proposedWork` are
 * the EXACT shapes that would persist to meetings.discussion / assigned_work
 * when Cowork (DB owner) runs the persisting variant (scripts/run-meeting.ts).
 *
 *   pnpm --filter executive-dashboard exec tsx scripts/run-meeting-dryrun.ts
 *
 * Strategic agenda + required_outputs are inlined to match the seeded
 * meeting_type_configs row (0024). Evidence is framing context only — no
 * fabricated metrics.
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();
import { randomUUID } from 'node:crypto';
import { getAnthropic, type ExecutiveId } from '../lib/doos/meeting-personas';
import {
  runMeeting,
  isDeliberative,
  type MeetingStore,
  type EvidenceItem,
} from '../lib/doos/meeting-orchestrator';

const PROJECT_SLUG = 'automation-app';
const MEETING_TYPE = 'strategic';
const TOPIC =
  'Choose the ONE hero automation to put first for Automation App — the CTO favors technical differentiation and feasibility; the CFO favors fastest ROI and runway discipline. Pick one and commit.';

// Matches the seeded meeting_type_configs('strategic') row in migration 0024.
const PARTICIPANTS: ExecutiveId[] = ['chief-of-staff', 'cto', 'cfo', 'vp-marketing', 'vp-sales'];
const AGENDA = ['Context & objective', 'Options on the table', 'Trade-offs & risks', 'Recommendation'];
const REQUIRED_OUTPUTS = {
  decision: 'required',
  rationale: 'required',
  dissenting_opinions: 'required',
  next_steps: 'required',
};

// Framing context only (no fabricated numbers).
const EVIDENCE: EvidenceItem[] = [
  { kind: 'business', text: 'Automation App is a consumer automation marketplace, currently in active execution.' },
  { kind: 'constraint', text: 'Engineering capacity is finite — only one hero automation can be resourced first this quarter.' },
  { kind: 'constraint', text: 'Runway discipline: the chosen hero must show measurable ROI within the current funding window.' },
];

async function main() {
  const anthropic = getAnthropic();
  const meetingId = randomUUID();

  // In-memory store — collects, never persists.
  const captured: { status: string[]; final: unknown; work: unknown } = { status: [], final: null, work: null };
  const store: MeetingStore = {
    async setStatus(_id, status) {
      captured.status.push(status);
    },
    async appendDiscussion() {
      /* in-memory only; orchestrator also keeps the array */
    },
    async finalize(_id, final) {
      captured.final = final;
    },
    async insertAssignedWork(rows) {
      captured.work = rows;
    },
  };

  console.log(`\n=== DRY RUN meeting ${meetingId} (${MEETING_TYPE} · ${PROJECT_SLUG}) — NO DB writes ===\n`);

  const result = await runMeeting(anthropic, store, {
    id: meetingId,
    projectSlug: PROJECT_SLUG,
    type: MEETING_TYPE,
    topic: TOPIC,
    participants: PARTICIPANTS,
    agenda: AGENDA,
    requiredOutputs: REQUIRED_OUTPUTS,
    evidencePack: EVIDENCE,
    deliberative: isDeliberative(MEETING_TYPE),
    moderator: 'chief-of-staff',
  });

  console.log('================ DISCUSSION TRANSCRIPT ================\n');
  for (const u of result.discussion) {
    const tgt = u.target ? ` → ${u.target}` : '';
    console.log(`[R${u.round} · ${u.kind.toUpperCase()}${tgt}] ${u.executive_id}`);
    if (u.claim) console.log(`   re: "${u.claim}"`);
    console.log(`   ${u.text.replace(/\n/g, '\n   ')}\n`);
  }

  console.log('================ CoS SYNTHESIS ================\n');
  console.log(`SUMMARY: ${result.final.summary}\n`);
  result.final.decisions.forEach((d, i) => {
    console.log(`DECISION ${i + 1}: ${d.decision}`);
    console.log(`  rationale: ${d.rationale}`);
    console.log(`  dissent: ${d.dissenting_opinions.length ? d.dissenting_opinions.join(' | ') : '(none recorded)'}`);
    console.log(`  actionable: ${d.actionable}${d.owner_executive_id ? ` · owner ${d.owner_executive_id}` : ''}\n`);
  });
  if (result.final.risks.length) console.log(`RISKS: ${result.final.risks.join(' | ')}\n`);
  if (result.final.open_questions.length) console.log(`OPEN QUESTIONS: ${result.final.open_questions.join(' | ')}\n`);

  console.log('================ PROPOSED assigned_work (status=proposed) ================\n');
  result.proposedWork.forEach((w, i) => {
    console.log(`  ${i + 1}. [${w.owner_executive_id}] ${w.title}`);
    console.log(`     ${w.detail}`);
    console.log(`     priority=${w.priority} due=${w.due_date ?? '—'} source=${w.source_type}:${w.source_id} approval=${w.approval_status}\n`);
  });

  console.log('================ GATE (D076) ================');
  console.log(`  challenge utterances (kind=challenge, with target): ${result.validation.challengeCount}`);
  console.log(`  position→challenge→rebuttal→synthesis→proposed work: ${result.validation.passedGate ? 'PRESENT' : 'MISSING'}`);
  console.log(`  CoS output valid vs required_outputs: ${result.validation.outputValid}`);
  if (result.validation.notes.length) console.log(`  notes: ${result.validation.notes.join('; ')}`);
  console.log(`  meeting status: ${result.status}`);
}

main().catch((e) => {
  console.error('RUN FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
