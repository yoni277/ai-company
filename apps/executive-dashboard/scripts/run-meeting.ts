/**
 * L30 proof harness (Step 3) — run ONE real strategic meeting against live
 * Anthropic + Supabase and print the transcript + proposed assigned_work.
 *
 * Engine first (D076): this wires the orchestrator to a Supabase-backed store;
 * the same engine (lib/doos/meeting-orchestrator.ts) the future API route will
 * use. Writes ONLY the new additive tables (meetings, assigned_work) — never an
 * existing DOOS table.
 *
 *   pnpm --filter executive-dashboard exec tsx scripts/run-meeting.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { getAnthropic, type ExecutiveId } from '../lib/doos/meeting-personas';
import {
  runMeeting,
  isDeliberative,
  type MeetingStore,
  type Utterance,
  type EvidenceItem,
  type AssignedWorkProposal,
  type MeetingFinal,
} from '../lib/doos/meeting-orchestrator';

const PROJECT_SLUG = 'automation-app';
const MEETING_TYPE = 'strategic';
const TOPIC =
  'Choose the ONE hero automation to put first for Automation App — the CTO favors technical differentiation and feasibility; the CFO favors fastest ROI and runway discipline. Pick one and commit.';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function main() {
  const supa = createClient(
    env('NEXT_PUBLIC_SUPABASE_URL'),
    env('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false }, db: { schema: process.env.SUPABASE_SCHEMA ?? 'ai_company' } },
  );
  const anthropic = getAnthropic();

  // Type config drives the contract (agenda + required_outputs + participants).
  const { data: cfg, error: cfgErr } = await supa
    .from('meeting_type_configs')
    .select('*')
    .eq('type', MEETING_TYPE)
    .single();
  if (cfgErr || !cfg) throw new Error(`meeting_type_configs '${MEETING_TYPE}' not found: ${cfgErr?.message}`);

  const participants = (cfg.default_participants as ExecutiveId[]) ?? ['chief-of-staff', 'cto', 'cfo'];
  const agenda = (cfg.default_agenda as string[]) ?? [];
  const requiredOutputs = (cfg.required_outputs as Record<string, unknown>) ?? {};

  // Evidence pack from live data for the business (read-only).
  const evidencePack: EvidenceItem[] = [];
  const { data: proj } = await supa
    .from('project_definitions')
    .select('id, slug, name, description')
    .eq('slug', PROJECT_SLUG)
    .single();
  if (proj?.description) evidencePack.push({ kind: 'business', text: `${proj.name}: ${proj.description}` });
  const { data: risks } = await supa
    .from('risks')
    .select('id, description, severity, status')
    .limit(5);
  for (const r of risks ?? []) {
    evidencePack.push({ kind: 'risk', text: `[${r.severity}/${r.status}] ${r.description}`, ref: r.id });
  }
  const { data: reports } = await supa
    .from('executive_reports')
    .select('id, executive_id, summary')
    .order('created_at', { ascending: false })
    .limit(3);
  for (const rep of reports ?? []) {
    evidencePack.push({ kind: 'report', text: `${rep.executive_id}: ${rep.summary}`, ref: rep.id });
  }

  // Create the meeting row (scheduled).
  const { data: created, error: insErr } = await supa
    .from('meetings')
    .insert({
      project_slug: PROJECT_SLUG,
      type: MEETING_TYPE,
      topic: TOPIC,
      initiator: 'ceo',
      moderator_executive_id: 'chief-of-staff',
      participants,
      status: 'scheduled',
      agenda,
      evidence_pack: evidencePack,
    })
    .select('id')
    .single();
  if (insErr || !created) throw new Error(`failed to create meeting: ${insErr?.message}`);
  const meetingId = created.id as string;
  console.log(`\n=== Created meeting ${meetingId} (${MEETING_TYPE} · ${PROJECT_SLUG}) ===\n`);

  // Supabase-backed store. discussion is rewritten cumulatively (jsonb).
  const running: Utterance[] = [];
  const store: MeetingStore = {
    async setStatus(id, status) {
      await supa.from('meetings').update({ status }).eq('id', id);
    },
    async appendDiscussion(id, us) {
      running.push(...us);
      const { error } = await supa.from('meetings').update({ discussion: running }).eq('id', id);
      if (error) throw new Error(`persist discussion failed: ${error.message}`);
    },
    async finalize(id, final: MeetingFinal, status) {
      const { error } = await supa
        .from('meetings')
        .update({
          summary: final.summary,
          decisions: final.decisions,
          risks: final.risks,
          open_questions: final.open_questions,
          status,
        })
        .eq('id', id);
      if (error) throw new Error(`finalize failed: ${error.message}`);
    },
    async insertAssignedWork(rows: AssignedWorkProposal[]): Promise<string[]> {
      const payload = rows.map(({ decisionIndex: _drop, ...rest }) => rest);
      const { data, error } = await supa.from('assigned_work').insert(payload).select('id');
      if (error) throw new Error(`insert assigned_work failed: ${error.message}`);
      return (data ?? []).map((r) => r.id as string);
    },
  };

  const result = await runMeeting(anthropic, store, {
    id: meetingId,
    projectSlug: PROJECT_SLUG,
    type: MEETING_TYPE,
    topic: TOPIC,
    participants,
    agenda,
    requiredOutputs,
    evidencePack,
    deliberative: isDeliberative(MEETING_TYPE),
    moderator: 'chief-of-staff',
  });

  // ---- Print the transcript ----
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
    console.log(`     priority=${w.priority} due=${w.due_date ?? '—'} source=${w.source_type}:${w.source_id}\n`);
  });

  console.log('================ GATE (D076) ================');
  console.log(`  challenge utterances (kind=challenge, with target): ${result.validation.challengeCount}`);
  console.log(`  position→challenge→rebuttal→synthesis→proposed work: ${result.validation.passedGate ? 'PRESENT' : 'MISSING'}`);
  console.log(`  CoS output valid vs required_outputs: ${result.validation.outputValid}`);
  if (result.validation.notes.length) console.log(`  notes: ${result.validation.notes.join('; ')}`);
  console.log(`  meeting status: ${result.status}`);
  console.log(`\n=== meeting ${meetingId} · ${result.proposedWork.length} proposed work item(s) ===`);
}

main().catch((e) => {
  console.error('RUN FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
