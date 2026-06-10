/**
 * L30 — Executive Meeting orchestrator (engine first, D071/D076).
 * Spec: docs/design/L30_IMPLEMENTATION_SPEC.md §2–§4.
 *
 * Bounded rounds, guaranteed termination (fixed round count, no convergence
 * loop). R0 CoS open → R1 positions → R2 challenge (each exec MUST challenge a
 * specific peer or concur-with-reasoning; an all-concur round in deliberative
 * types is rejected and re-prompted once) → R3 rebuttal → R4 CoS synthesis
 * (validated vs the type's required_outputs). Each round persists via the
 * injected MeetingStore (resumable/auditable). Actionable decisions emit
 * `assigned_work` rows as `proposed` — the CEO approval gate (no side effect
 * bypasses ceo_decisions).
 *
 * Decoupled from the Next-wired platform: it takes an Anthropic client, a store,
 * and an evidence pack — so the proof script and the future API route share the
 * exact same engine.
 */

import type Anthropic from '@anthropic-ai/sdk';
import {
  MEETING_PERSONAS,
  callPosition,
  callChallenge,
  callRebuttal,
  callSynthesis,
  type ExecutiveId,
  type SynthesisDecision,
} from './meeting-personas';
import { ensureOwnedWorkOrNoAction, type ConversionOutcome } from './meeting-conversion';

export type UtteranceKind = 'open' | 'position' | 'challenge' | 'concur' | 'rebuttal' | 'synthesis';

export interface Utterance {
  round: number;
  executive_id: string;
  kind: UtteranceKind;
  target?: string | null;
  claim?: string;
  text: string;
  refs?: string[];
}

export interface EvidenceItem {
  kind: string; // 'risk' | 'outcome' | 'note' | …
  text: string;
  ref?: string;
}

export interface MeetingInput {
  id: string;
  projectSlug: string;
  type: string;
  topic: string;
  participants: ExecutiveId[];
  agenda: string[];
  requiredOutputs: Record<string, unknown>;
  evidencePack: EvidenceItem[];
  /** deliberative types reject an all-concur challenge round and re-prompt. */
  deliberative: boolean;
  moderator?: ExecutiveId;
}

export interface AssignedWorkProposal {
  /** The index in final.decisions this work came from — the stable link key. */
  decisionIndex: number;
  project_slug: string;
  source_type: 'meeting';
  source_id: string;
  owner_executive_id: string;
  title: string;
  detail: string;
  approval_status: 'proposed';
  execution_status: 'open';
  priority: string;
  due_date: string | null;
  created_by: 'chief-of-staff';
}

export interface MeetingFinal {
  summary: string;
  decisions: SynthesisDecision[];
  risks: string[];
  open_questions: string[];
}

/** Persistence seam — script uses a Supabase-backed impl; API will use repos. */
export interface MeetingStore {
  setStatus(meetingId: string, status: string): Promise<void>;
  appendDiscussion(meetingId: string, utterances: Utterance[]): Promise<void>;
  finalize(meetingId: string, final: MeetingFinal, status: string): Promise<void>;
  /** Insert proposed work; MUST return the new row ids in the SAME order as `rows`. */
  insertAssignedWork(rows: AssignedWorkProposal[]): Promise<string[]>;
}

export interface RunResult {
  discussion: Utterance[];
  final: MeetingFinal;
  proposedWork: AssignedWorkProposal[];
  status: 'summarized' | 'in_discussion';
  validation: { challengeCount: number; passedGate: boolean; outputValid: boolean; notes: string[] };
  /** OF-008 — what the conversion guarantee did (owned work / fallback / honest no-action). */
  conversion: ConversionOutcome;
}

const DELIBERATIVE_TYPES = new Set(['strategic', 'go_no_go', 'architecture_review', 'product_review']);

function name(id: ExecutiveId): string {
  return MEETING_PERSONAS[id]?.role ?? id;
}

function fmtEvidence(pack: EvidenceItem[]): string {
  if (pack.length === 0) return '(no evidence pack provided)';
  return pack.map((e, i) => `  [E${i + 1}] (${e.kind}) ${e.text}${e.ref ? ` — ref:${e.ref}` : ''}`).join('\n');
}

function fmtPositions(positions: Utterance[]): string {
  return positions
    .map((p) => `  ${name(p.executive_id as ExecutiveId)} (${p.executive_id}):\n    ${p.text.replace(/\n/g, '\n    ')}`)
    .join('\n\n');
}

function header(m: MeetingInput): string {
  return [
    `MEETING TYPE: ${m.type}`,
    `BUSINESS: ${m.projectSlug}`,
    `TOPIC: ${m.topic}`,
    `AGENDA:\n${m.agenda.map((a) => `  - ${a}`).join('\n')}`,
    `EVIDENCE:\n${fmtEvidence(m.evidencePack)}`,
  ].join('\n');
}

/**
 * OF-007 — the shared meeting context pack (assembled ONCE per meeting, shared to
 * all participants). companyContext → each persona's system; operationalContext →
 * prepended to the round prompts. Absent ⇒ byte-identical to the pre-pack run.
 */
export interface MeetingContext {
  companyContext: string;
  operationalContext: string;
}

export async function runMeeting(
  client: Anthropic,
  store: MeetingStore,
  m: MeetingInput,
  context?: MeetingContext,
): Promise<RunResult> {
  const moderator: ExecutiveId = m.moderator ?? 'chief-of-staff';
  const sys = context?.companyContext;
  const hdr = () => (context ? `${context.operationalContext}\n\n${header(m)}` : header(m));
  // Participants that actually debate (the moderator runs the room, no position).
  const debaters = m.participants.filter((p) => p !== moderator);
  const discussion: Utterance[] = [];
  const push = async (us: Utterance[]) => {
    discussion.push(...us);
    await store.appendDiscussion(m.id, us);
  };

  // R0 — CoS opens: frame the question + decision the meeting must produce.
  await store.setStatus(m.id, 'open');
  const openText = await callPosition(
    client,
    moderator,
    `${hdr()}\n\nYou are moderating. In 3-4 sentences, open this meeting: frame the precise decision the room must produce and the trade-off at its heart. Name the participants: ${debaters.map(name).join(', ')}.`,
    sys,
  );
  await push([{ round: 0, executive_id: moderator, kind: 'open', text: openText }]);
  await store.setStatus(m.id, 'in_discussion');

  // R1 — opening positions (each debater, blind to the others).
  const positions: Utterance[] = [];
  for (const id of debaters) {
    const text = await callPosition(
      client,
      id,
      `${hdr()}\n\nThe Chief of Staff opened: "${openText}"\n\nGive YOUR opening position on the decision. Take a clear, specific stance grounded in the evidence. 2-4 sentences.`,
      sys,
    );
    const u: Utterance = { round: 1, executive_id: id, kind: 'position', text };
    positions.push(u);
    await push([u]);
  }

  // R2 — challenge: each debater addresses a SPECIFIC peer (challenge or concur).
  const runChallengeRound = async (insist: boolean): Promise<Utterance[]> => {
    const out: Utterance[] = [];
    for (const id of debaters) {
      const peers = positions.filter((p) => p.executive_id !== id);
      const prompt = [
        hdr(),
        `All opening positions:\n${fmtPositions(positions)}`,
        `You are ${name(id)}. Address ONE specific peer's claim by name. ${
          insist
            ? 'The room was too agreeable — find the real disagreement and CHALLENGE it. Concurring is not allowed this round unless you genuinely cannot.'
            : 'Either CHALLENGE their claim with counter-reasoning/evidence, or CONCUR with a specific reason. Default to challenge where you see real risk.'
        } Peers: ${peers.map((p) => `${name(p.executive_id as ExecutiveId)} (${p.executive_id})`).join(', ')}.`,
      ].join('\n\n');
      const c = await callChallenge(client, id, prompt, sys);
      const u: Utterance = {
        round: 2,
        executive_id: id,
        kind: c.stance === 'challenge' ? 'challenge' : 'concur',
        target: c.target,
        claim: c.claimAddressed,
        text: c.text,
      };
      out.push(u);
    }
    return out;
  };

  let challenges = await runChallengeRound(false);
  const hasRealChallenge = (us: Utterance[]) => us.some((u) => u.kind === 'challenge' && u.target);
  // Reject an all-concur round in deliberative types — re-prompt once.
  if (m.deliberative && !hasRealChallenge(challenges)) {
    await push([{ round: 2, executive_id: moderator, kind: 'open', text: 'No real challenge surfaced — re-opening for genuine contention.' }]);
    challenges = await runChallengeRound(true);
  }
  await push(challenges);

  // R3 — rebuttal: each challenged debater responds once (bounded).
  const challengedIds = Array.from(
    new Set(challenges.filter((c) => c.kind === 'challenge' && c.target).map((c) => c.target as string)),
  ).filter((t): t is ExecutiveId => debaters.includes(t as ExecutiveId));
  for (const id of challengedIds) {
    const against = challenges.filter((c) => c.target === id && c.kind === 'challenge');
    const prompt = [
      hdr(),
      `Your opening position was: "${positions.find((p) => p.executive_id === id)?.text ?? ''}"`,
      `Challenges raised against you:\n${against
        .map((c) => `  ${name(c.executive_id as ExecutiveId)}: ${c.text}`)
        .join('\n')}`,
      `Respond once. Concede what is fair, defend what holds, and sharpen the actual decision. 2-3 sentences.`,
    ].join('\n\n');
    const text = await callRebuttal(client, id, prompt, sys);
    await push([{ round: 3, executive_id: id, kind: 'rebuttal', text }]);
  }

  // R4 — CoS synthesis + the OF-008 conversion guarantee. Delegated so the
  // resume/synthesize path runs the EXACT same close on a persisted discussion.
  return synthesizeAndConvert(client, store, m, discussion, push, context);
}

/**
 * OF-008 — R4 CoS synthesis + conversion guarantee + emission, factored out so
 * BOTH a full run and a resume (re-synthesize a stalled meeting from its
 * persisted discussion) drive the identical close. Always reaches `summarized`:
 * the conversion net guarantees owned work OR an explicit honest no-action, so a
 * meeting never stalls in agreement-without-work. (A genuine mid-run error is the
 * only thing that leaves a meeting `in_discussion` — that is what resume fixes.)
 */
export async function synthesizeAndConvert(
  client: Anthropic,
  store: MeetingStore,
  m: MeetingInput,
  discussion: Utterance[],
  push: (us: Utterance[]) => Promise<void>,
  context?: MeetingContext,
): Promise<RunResult> {
  const moderator: ExecutiveId = m.moderator ?? 'chief-of-staff';
  const debaters = m.participants.filter((p) => p !== moderator);
  const sys = context?.companyContext;
  const hdr = context ? `${context.operationalContext}\n\n${header(m)}` : header(m);

  const synthPrompt = (insist: boolean) =>
    [
      hdr,
      `FULL TRANSCRIPT:\n${discussion
        .map((u) => `  [R${u.round} ${u.kind}${u.target ? `→${u.target}` : ''}] ${name(u.executive_id as ExecutiveId)}: ${u.text}`)
        .join('\n')}`,
      `Required outputs for a "${m.type}" meeting: ${JSON.stringify(m.requiredOutputs)}.`,
      `As Chief of Staff, close the meeting. Produce a faithful summary, the decision(s) with rationale and HONEST dissenting opinions (record unresolved disagreement — never fake consensus), risks, and open questions.`,
      `CRITICAL — operationalize the outcome. Either: (a) produce AT LEAST ONE actionable decision (actionable=true) with a NAMED owner_executive_id (one of: ${debaters.join(', ')}), a work_title, a work_detail, and due_in_days — even a "defer pending more evidence" or "gather the shortlist" outcome is owned by a specific executive who does that work; OR (b) if the room genuinely concluded NO action is required, say so explicitly: a single decision with actionable=false whose rationale begins "No action needed:" and states the reason. Never leave the next step only as an open question, and never end in agreement without either owned work or an explicit no-action.${
        insist ? ' Your previous attempt produced neither owned actionable work nor an explicit no-action — that is invalid. Decide now: assign the next step to a specific executive, or state no action is needed and why.' : ''
      }`,
    ].join('\n\n');

  const validate = (final: MeetingFinal): { ok: boolean; notes: string[] } => {
    const notes: string[] = [];
    if (!final.summary.trim()) notes.push('missing summary');
    if (final.decisions.length === 0) notes.push('no decisions');
    if (final.decisions.some((d) => !d.rationale.trim())) notes.push('a decision lacks rationale');
    if (!final.decisions.some((d) => d.actionable && d.owner_executive_id))
      notes.push('no owned actionable decision (conversion net will resolve)');
    if (m.type === 'go_no_go') {
      const hasVerdict = final.decisions.some((d) => /\b(GO|HOLD|NO-?GO)\b/i.test(d.decision));
      if (!hasVerdict) notes.push('go_no_go: no GO/HOLD/NO-GO verdict');
    }
    return { ok: notes.length === 0, notes };
  };

  let final = toFinal(await callSynthesis(client, synthPrompt(false), sys));
  let check = validate(final);
  if (!check.ok) {
    final = toFinal(await callSynthesis(client, synthPrompt(true), sys));
    check = validate(final);
  }

  // OF-008 conversion guarantee — owned work or explicit honest no-action; never
  // a silent agreement-without-work. Mutates final.decisions when it synthesizes
  // an owned next step. Honest dissent (D076) is preserved.
  const conversion = ensureOwnedWorkOrNoAction(final.decisions, final.summary, moderator, m.topic);
  if (conversion.noAction) {
    final.summary = `No action needed — ${conversion.noAction.reason}\n\n${final.summary}`.trim();
  }

  await push([{ round: 4, executive_id: moderator, kind: 'synthesis', text: final.summary }]);

  // Emit proposed assigned_work for each owned actionable decision, carrying the
  // source decision index so it links back unambiguously.
  const proposedWork: AssignedWorkProposal[] = [];
  final.decisions.forEach((d, di) => {
    if (d.actionable && d.owner_executive_id) {
      proposedWork.push({
        decisionIndex: di,
        project_slug: m.projectSlug,
        source_type: 'meeting',
        source_id: m.id,
        owner_executive_id: d.owner_executive_id,
        title: d.work_title || d.decision,
        detail: d.work_detail || d.rationale,
        approval_status: 'proposed',
        execution_status: 'open',
        priority: 'P2',
        due_date: dueDate(d.due_in_days),
        created_by: 'chief-of-staff',
      });
    }
  });

  // Insert first so we can stamp each decision with its assigned_work id — the
  // approve route + detail page then map decision↔work by id, not by a fragile
  // created_at ordering (fixes the "approved ✓" badge on the wrong card).
  if (proposedWork.length > 0) {
    const ids = await store.insertAssignedWork(proposedWork);
    proposedWork.forEach((w, k) => {
      const id = ids[k];
      if (id) final.decisions[w.decisionIndex]!.assignedWorkId = id;
    });
  }

  // The conversion guarantee means R4 always produces a terminal synthesis.
  const status: 'summarized' = 'summarized';
  await store.finalize(m.id, final, status);

  const challengeCount = discussion.filter((u) => u.kind === 'challenge' && u.target).length;
  return {
    discussion,
    final,
    proposedWork,
    status,
    validation: {
      challengeCount,
      passedGate: challengeCount >= 1,
      outputValid: check.ok,
      notes: check.notes,
    },
    conversion,
  };
}

function toFinal(s: { summary: string; decisions: SynthesisDecision[]; risks: string[]; open_questions: string[] }): MeetingFinal {
  return { summary: s.summary, decisions: s.decisions, risks: s.risks, open_questions: s.open_questions };
}

/** Deterministic due date from a day offset — no clock read in the engine core. */
function dueDate(daysFromNow: number | null): string | null {
  if (daysFromNow == null) return null;
  const ms = Date.now() + daysFromNow * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function isDeliberative(type: string): boolean {
  return DELIBERATIVE_TYPES.has(type);
}
