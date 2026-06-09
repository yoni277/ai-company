import 'server-only';

/**
 * L30 — Executive Meetings data layer (spec §5/§8). Reads/writes the meetings +
 * assigned_work tables via the service-role admin client; reuses the verified
 * createDecision (ceo_decisions) for the approval gate. The /run path drives the
 * orchestrator engine (lib/doos/meeting-orchestrator.ts). Every read is scoped
 * by project_slug; meeting output stays `proposed` until the CEO approves, and
 * no assigned_work is `approved` without a ceo_decisions row (condition #3/#4).
 */

import { getSupabaseAdmin } from '../doos/supabase-admin';
import { getAnthropic, type ExecutiveId } from '../doos/meeting-personas';
import {
  runMeeting,
  isDeliberative,
  type MeetingStore,
  type Utterance,
  type EvidenceItem,
  type AssignedWorkProposal,
  type MeetingFinal,
} from '../doos/meeting-orchestrator';
import type { SynthesisDecision } from '../doos/meeting-personas';
import { createDecision } from '../ceo-operating-system';

export interface MeetingTypeConfig {
  type: string;
  label: string;
  defaultParticipants: string[];
  defaultAgenda: string[];
  requiredOutputs: Record<string, unknown>;
  description: string | null;
}

export interface MeetingListItem {
  id: string;
  projectSlug: string;
  type: string;
  topic: string;
  status: string;
  participants: string[];
  createdAt: string;
}

export interface ProposedWorkRow {
  id: string;
  ownerExecutiveId: string;
  title: string;
  detail: string;
  approvalStatus: string;
  executionStatus: string;
  priority: string;
  dueDate: string | null;
}

export interface MeetingDetail {
  id: string;
  projectSlug: string;
  type: string;
  topic: string;
  initiator: string;
  moderatorExecutiveId: string;
  participants: string[];
  status: string;
  agenda: string[];
  evidencePack: EvidenceItem[];
  discussion: Utterance[];
  summary: string | null;
  decisions: SynthesisDecision[];
  risks: string[];
  openQuestions: string[];
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  proposedWork: ProposedWorkRow[];
}

/* ---- type catalog (drives the wizard) ---- */
export async function listMeetingTypes(): Promise<MeetingTypeConfig[]> {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa.from('meeting_type_configs').select('*').order('type');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    type: r.type,
    label: r.label,
    defaultParticipants: r.default_participants ?? [],
    defaultAgenda: r.default_agenda ?? [],
    requiredOutputs: r.required_outputs ?? {},
    description: r.description ?? null,
  }));
}

export async function listBusinessSlugs(): Promise<Array<{ slug: string; name: string }>> {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from('project_definitions')
    .select('slug, name, enabled')
    .eq('enabled', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ slug: r.slug, name: r.name }));
}

/* ---- evidence picker options for a business (SERVER-scoped) ----
 * Cross-tenant safety: scope strictly to this business. risks.project_id is a
 * uuid → legacy projects(id), so resolve slug→id and filter. executive_reports
 * carry no project column (company-wide), so they are NOT surfaced in a
 * per-business picker — never rely on the client to scope evidence. */
export async function listEvidenceOptions(projectSlug: string): Promise<EvidenceItem[]> {
  const supa = getSupabaseAdmin();
  const out: EvidenceItem[] = [];
  const { data: proj } = await supa
    .from('projects')
    .select('id')
    .eq('slug', projectSlug)
    .maybeSingle();
  if (!proj?.id) return out;
  const { data: risks } = await supa
    .from('risks')
    .select('id, description, severity, status')
    .eq('project_id', proj.id)
    .limit(8);
  for (const r of risks ?? []) {
    out.push({ kind: 'risk', text: `[${r.severity}/${r.status}] ${r.description}`, ref: r.id });
  }
  return out;
}

/* ---- create ---- */
export interface CreateMeetingInput {
  projectSlug: string;
  type: string;
  topic: string;
  participants?: string[] | undefined;
  objectiveId?: string | null;
  directiveId?: string | null;
  evidencePack?: EvidenceItem[] | undefined;
}

export async function createMeeting(input: CreateMeetingInput): Promise<{ id: string }> {
  const supa = getSupabaseAdmin();
  // Server-side scope check: the meeting must target a registered, enabled
  // business — never trust the wizard. (The FK already blocks unknown slugs;
  // this also blocks disabled ones and gives a clean error.)
  const { data: biz } = await supa
    .from('project_definitions')
    .select('slug')
    .eq('slug', input.projectSlug)
    .eq('enabled', true)
    .maybeSingle();
  if (!biz) throw new Error(`Unknown or disabled business '${input.projectSlug}'`);

  const { data: cfg, error: cfgErr } = await supa
    .from('meeting_type_configs')
    .select('default_participants, default_agenda')
    .eq('type', input.type)
    .single();
  if (cfgErr || !cfg) throw new Error(`Unknown meeting type '${input.type}'`);

  const participants =
    input.participants && input.participants.length > 0
      ? input.participants
      : (cfg.default_participants ?? []);

  const { data, error } = await supa
    .from('meetings')
    .insert({
      project_slug: input.projectSlug,
      type: input.type,
      topic: input.topic,
      objective_id: input.objectiveId ?? null,
      directive_id: input.directiveId ?? null,
      initiator: 'ceo',
      moderator_executive_id: 'chief-of-staff',
      participants,
      status: 'scheduled',
      agenda: cfg.default_agenda ?? [],
      evidence_pack: input.evidencePack ?? [],
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'failed to create meeting');
  return { id: data.id as string };
}

/* ---- get ---- */
export async function getMeeting(id: string): Promise<MeetingDetail | null> {
  const supa = getSupabaseAdmin();
  const { data: m, error } = await supa.from('meetings').select('*').eq('id', id).single();
  if (error || !m) return null;
  const { data: work } = await supa
    .from('assigned_work')
    .select('*')
    .eq('source_id', id)
    .eq('source_type', 'meeting')
    .order('created_at');
  return {
    id: m.id,
    projectSlug: m.project_slug,
    type: m.type,
    topic: m.topic,
    initiator: m.initiator,
    moderatorExecutiveId: m.moderator_executive_id,
    participants: m.participants ?? [],
    status: m.status,
    agenda: m.agenda ?? [],
    evidencePack: m.evidence_pack ?? [],
    discussion: m.discussion ?? [],
    summary: m.summary ?? null,
    decisions: m.decisions ?? [],
    risks: m.risks ?? [],
    openQuestions: m.open_questions ?? [],
    approvedBy: m.approved_by ?? null,
    approvedAt: m.approved_at ?? null,
    createdAt: m.created_at,
    proposedWork: (work ?? []).map((w) => ({
      id: w.id,
      ownerExecutiveId: w.owner_executive_id,
      title: w.title,
      detail: w.detail ?? '',
      approvalStatus: w.approval_status,
      executionStatus: w.execution_status,
      priority: w.priority,
      dueDate: w.due_date ?? null,
    })),
  };
}

/* ---- list (scoped) ---- */
export async function listMeetings(filter: { projectSlug?: string; status?: string }): Promise<MeetingListItem[]> {
  const supa = getSupabaseAdmin();
  let q = supa
    .from('meetings')
    .select('id, project_slug, type, topic, status, participants, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (filter.projectSlug) q = q.eq('project_slug', filter.projectSlug);
  if (filter.status) q = q.eq('status', filter.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id,
    projectSlug: m.project_slug,
    type: m.type,
    topic: m.topic,
    status: m.status,
    participants: m.participants ?? [],
    createdAt: m.created_at,
  }));
}

/* ---- run (drives the orchestrator) ---- */
export async function runMeetingById(id: string): Promise<{ status: string; proposedWork: number }> {
  const supa = getSupabaseAdmin();
  const { data: m, error } = await supa.from('meetings').select('*').eq('id', id).single();
  if (error || !m) throw new Error('meeting not found');
  if (m.status === 'summarized' || m.status === 'approved' || m.status === 'completed') {
    const { data: existing } = await supa.from('assigned_work').select('id').eq('source_id', id);
    return { status: m.status, proposedWork: existing?.length ?? 0 };
  }

  const { data: cfg } = await supa
    .from('meeting_type_configs')
    .select('required_outputs')
    .eq('type', m.type)
    .single();

  // Reset any prior partial work for a clean re-run.
  await supa.from('assigned_work').delete().eq('source_id', id).eq('source_type', 'meeting');

  const running: Utterance[] = [];
  const store: MeetingStore = {
    async setStatus(mid, status) {
      await supa.from('meetings').update({ status }).eq('id', mid);
    },
    async appendDiscussion(mid, us) {
      running.push(...us);
      const { error: e } = await supa.from('meetings').update({ discussion: running }).eq('id', mid);
      if (e) throw new Error(e.message);
    },
    async finalize(mid, final: MeetingFinal, status) {
      const { error: e } = await supa
        .from('meetings')
        .update({
          summary: final.summary,
          decisions: final.decisions,
          risks: final.risks,
          open_questions: final.open_questions,
          status,
        })
        .eq('id', mid);
      if (e) throw new Error(e.message);
    },
    async insertAssignedWork(rows: AssignedWorkProposal[]): Promise<string[]> {
      // Strip decisionIndex (orchestrator bookkeeping, not a column). A single
      // INSERT … VALUES returns rows in input order, so ids[] lines up with rows[].
      const payload = rows.map(({ decisionIndex: _drop, ...rest }) => rest);
      const { data, error: e } = await supa.from('assigned_work').insert(payload).select('id');
      if (e) throw new Error(e.message);
      return (data ?? []).map((r) => r.id as string);
    },
  };

  const result = await runMeeting(getAnthropic(), store, {
    id,
    projectSlug: m.project_slug,
    type: m.type,
    topic: m.topic,
    participants: (m.participants ?? []) as ExecutiveId[],
    agenda: m.agenda ?? [],
    requiredOutputs: (cfg?.required_outputs ?? {}) as Record<string, unknown>,
    evidencePack: (m.evidence_pack ?? []) as EvidenceItem[],
    deliberative: isDeliberative(m.type),
    moderator: 'chief-of-staff',
  });

  return { status: result.status, proposedWork: result.proposedWork.length };
}

/* ---- approve (the single side-effect gate) ---- */
export interface ApproveVerdict {
  index: number;
  verdict: 'approve' | 'reject';
}

export async function approveMeeting(
  id: string,
  verdicts: ApproveVerdict[],
): Promise<{ status: string; approved: number; rejected: number }> {
  const supa = getSupabaseAdmin();
  const { data: m, error } = await supa.from('meetings').select('*').eq('id', id).single();
  if (error || !m) throw new Error('meeting not found');
  // State gate: only a summarized meeting (or one mid-approval) accepts verdicts.
  // Blocks approving a meeting that hasn't deliberated, and a cancelled one.
  if (m.status !== 'summarized' && m.status !== 'approved') {
    throw new Error(`meeting is '${m.status}', not awaiting approval`);
  }
  const decisions = (m.decisions ?? []) as SynthesisDecision[];

  // Dedupe verdicts by decision index (last wins); drop out-of-range indexes.
  const byIndex = new Map<number, 'approve' | 'reject'>();
  for (const v of verdicts) {
    if (Number.isInteger(v.index) && v.index >= 0 && v.index < decisions.length) {
      byIndex.set(v.index, v.verdict);
    }
  }

  let approved = 0;
  let rejected = 0;
  for (const [index, verdict] of byIndex) {
    const d = decisions[index];
    // Stable link: each decision carries the id of the assigned_work it created
    // (stamped at synthesis). No fragile position/created_at mapping.
    const workId = d?.assignedWorkId ?? null;
    if (!workId) continue; // non-actionable / no work — nothing to gate.

    // Act only if the work is still proposed — idempotent re-clicks, and no
    // duplicate ceo_decisions audit on an already-decided item.
    const { data: current } = await supa
      .from('assigned_work')
      .select('approval_status')
      .eq('id', workId)
      .maybeSingle();
    if (current?.approval_status !== 'proposed') continue;

    if (verdict === 'approve') {
      approved += 1;
      const decision = await createDecision({
        sourceActionId: null,
        projectId: m.project_slug,
        decisionTitle: d!.decision,
        decisionDescription: d!.rationale,
        decisionStatus: 'approved',
        owner: d!.owner_executive_id ?? null,
        dueDate: null,
        priority: 'P2',
        notes: `Approved from meeting ${id}`,
      });
      await supa
        .from('assigned_work')
        .update({ approval_status: 'approved', linked_decision_id: decision.id })
        .eq('id', workId)
        .eq('approval_status', 'proposed');
    } else {
      rejected += 1;
      await supa
        .from('assigned_work')
        .update({ approval_status: 'rejected' })
        .eq('id', workId)
        .eq('approval_status', 'proposed');
    }
  }

  // Skip the meeting write entirely when nothing changed state.
  if (approved === 0 && rejected === 0) {
    return { status: m.status, approved, rejected };
  }
  const status = approved > 0 ? 'approved' : 'cancelled';
  await supa
    .from('meetings')
    .update({ approved_by: 'ceo', approved_at: new Date().toISOString(), status })
    .eq('id', id);
  return { status, approved, rejected };
}
