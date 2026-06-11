import 'server-only';

/**
 * D086 Phase 1 (T1.1) — Communication Timeline, server IO wrapper.
 *
 * Binds the pure classifier (communication-timeline-core.ts) to the existing
 * tables via existing repo patterns + the admin client. NO schema changes, NO
 * new tables — reads only. Resolves any source (directive / instruction /
 * meeting / decision / work) to its originating communication, fetches each
 * lineage stage, and returns the classified timeline plus the set of REUSED
 * action targets the Inspector renders (WorkRowActions / CeoReplyBox /
 * DecisionQueueItem). Structured for a later packages/ extraction (out of scope
 * here — see context-pack Phase 4 precedent).
 */

import { getSupabaseAdmin } from '../doos/supabase-admin';
import { getPlatform } from '../platform';
import { getDirectiveById } from '../ceo-operating-system';
import { getMeeting } from './meetings';
import { classifyWork, type WorkState } from './work-state';
import {
  buildTimeline,
  type CommunicationTimeline,
  type LineageItem,
  type TimelineRaw,
  type TimelineSourceType,
} from './communication-timeline-core';

export type { CommunicationTimeline, TimelineSourceType } from './communication-timeline-core';

/** A proposed/decided item the Inspector can act on via DecisionQueueItem. */
export interface InspectorQueueItem {
  kind: 'decision' | 'proposal';
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string;
  dueDate: string | null;
  source: string | null;
  /** Matches QueueItem; always null here — inspector items are already in-thread. */
  directiveId: string | null;
}

/** Reused-action targets — the Inspector maps each to an existing component. */
export interface LineageActionTargets {
  /** → WorkRowActions (classified rows; approve/owner+date/execution). */
  workRows: {
    id: string;
    state: WorkState;
    ownerExecutiveId: string | null;
    dueDate: string | null;
    reviewDate: string | null;
  }[];
  /** → CeoReplyBox (an instruction awaiting a CEO answer). */
  ceoReply: { instructionId: string; instruction: string; question: string } | null;
  /** → DecisionQueueItem (proposals/decisions still awaiting a CEO decision). */
  decisionQueue: InspectorQueueItem[];
}

export interface LineageResult {
  timeline: CommunicationTimeline;
  actions: LineageActionTargets;
}

interface WorkRow {
  id: string;
  project_slug: string;
  source_type: string;
  source_id: string;
  owner_executive_id: string | null;
  title: string;
  detail: string | null;
  approval_status: string;
  execution_status: string;
  priority: string;
  due_date: string | null;
  review_date: string | null;
  linked_task_id: string | null;
  linked_decision_id: string | null;
  created_at: string;
  status_changed_at: string;
}

const WORK_COLS =
  'id, project_slug, source_type, source_id, owner_executive_id, title, detail, ' +
  'approval_status, execution_status, priority, due_date, review_date, ' +
  'linked_task_id, linked_decision_id, created_at, status_changed_at';

type Supa = ReturnType<typeof getSupabaseAdmin>;

async function loadWorkBySource(
  supa: Supa,
  sourceType: string,
  sourceId: string,
): Promise<WorkRow[]> {
  const { data } = await supa
    .from('assigned_work')
    .select(WORK_COLS)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);
  return (data ?? []) as unknown as WorkRow[];
}

async function loadWorkById(supa: Supa, id: string): Promise<WorkRow | null> {
  const { data } = await supa.from('assigned_work').select(WORK_COLS).eq('id', id).maybeSingle();
  return (data as unknown as WorkRow) ?? null;
}

async function loadDecisionsByIds(
  supa: Supa,
  ids: string[],
): Promise<Array<{ id: string; decision_title: string; decision_description: string | null; decision_status: string; owner: string | null; due_date: string | null; priority: string; created_at: string }>> {
  if (ids.length === 0) return [];
  const { data } = await supa
    .from('ceo_decisions')
    .select('id, decision_title, decision_description, decision_status, owner, due_date, priority, created_at')
    .in('id', ids);
  return (data ?? []) as never;
}

interface InstructionRow {
  id: string;
  instruction: string;
  to_executive_id: string;
  project_slug: string;
  status: string | null;
  priority: string | null;
  awaiting_ceo_input: boolean | null;
  response: string | null;
  ceo_response: string | null;
  linked_assigned_work_id: string | null;
  created_at: string;
}

async function loadInstructionById(supa: Supa, id: string): Promise<InstructionRow | null> {
  const { data } = await supa.from('direct_instructions').select('*').eq('id', id).maybeSingle();
  return (data as unknown as InstructionRow) ?? null;
}

function workToLineageItem(w: WorkRow): LineageItem {
  return {
    id: w.id,
    title: w.title,
    subtitle: w.detail,
    who: w.owner_executive_id,
    when: w.created_at,
    status: `${w.approval_status}/${w.execution_status}`,
    href: `/work?inspect=work:${w.id}`,
  };
}

function workToActionRow(w: WorkRow, now: string) {
  const { state } = classifyWork(
    {
      approvalStatus: w.approval_status,
      executionStatus: w.execution_status,
      dueDate: w.due_date,
      reviewDate: w.review_date,
      createdAt: w.created_at,
      statusChangedAt: w.status_changed_at,
    },
    now,
  );
  return {
    id: w.id,
    state,
    ownerExecutiveId: w.owner_executive_id,
    dueDate: w.due_date,
    reviewDate: w.review_date,
  };
}

/** Decisions linked from a set of work rows (work.linked_decision_id). */
async function decisionsForWork(supa: Supa, work: WorkRow[]): Promise<LineageItem[]> {
  const ids = [...new Set(work.map((w) => w.linked_decision_id).filter((x): x is string => Boolean(x)))];
  const rows = await loadDecisionsByIds(supa, ids);
  return rows.map((d) => ({
    id: d.id,
    title: d.decision_title,
    subtitle: d.decision_description,
    who: d.owner,
    when: d.created_at,
    status: d.decision_status,
  }));
}

/**
 * Assemble + classify the lineage for a communication. Read-only; never throws
 * to the route — returns null when the source cannot be resolved (the route
 * renders an explicit empty/unknown state).
 */
export async function assembleCommunicationTimeline(input: {
  sourceType: TimelineSourceType;
  sourceId: string;
}): Promise<LineageResult | null> {
  const supa = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { repos } = getPlatform();

  // Resolve any entry point to its originating communication.
  let rootType = input.sourceType;
  let rootId = input.sourceId;

  if (input.sourceType === 'work') {
    const w = await loadWorkById(supa, input.sourceId);
    if (!w) return null;
    rootType = (w.source_type as TimelineSourceType) ?? 'work';
    rootId = w.source_id ?? input.sourceId;
  } else if (input.sourceType === 'decision') {
    // Find the work this decision approved, then walk to its source.
    const { data } = await supa
      .from('assigned_work')
      .select(WORK_COLS)
      .eq('linked_decision_id', input.sourceId)
      .limit(1);
    const w = (data ?? [])[0] as unknown as WorkRow | undefined;
    if (w) {
      rootType = (w.source_type as TimelineSourceType) ?? 'decision';
      rootId = w.source_id ?? input.sourceId;
    }
  }

  if (rootType === 'directive') {
    const directive = await getDirectiveById(rootId);
    if (!directive) return null;
    const [responses, reports, proposals, work, tasks] = await Promise.all([
      repos.directiveResponses.listByDirective(rootId),
      repos.reports.listByDirective(rootId),
      repos.taskProposals.listByDirective(rootId),
      loadWorkBySource(supa, 'directive', rootId),
      repos.tasks.list({ directiveId: rootId }),
    ]);
    const decisions = await decisionsForWork(supa, work);
    const raw: TimelineRaw = {
      sourceType: 'directive',
      sourceId: rootId,
      origin: {
        id: directive.id,
        title: directive.title,
        subtitle: directive.directive,
        who: 'CEO',
        when: directive.createdAt,
        href: `/ceo/directives/${directive.id}`,
      },
      responses: responses.map((r) => ({
        id: r.id,
        title: r.executiveId,
        who: r.executiveId,
        when: r.updatedAt,
        status: r.status,
      })),
      reports: reports.map((r) => ({
        id: r.id,
        title: r.summary,
        who: r.executiveId,
        when: r.createdAt,
        href: `/reports/${r.id}`,
      })),
      proposals: proposals.map((p) => ({
        id: p.id,
        title: p.payload.title,
        subtitle: p.payload.description ?? null,
        who: p.sourceExecutiveId,
        when: p.createdAt,
        status: p.status,
      })),
      work: work.map(workToLineageItem),
      decisions,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        who: t.ownerId ?? null,
        when: t.createdAt,
        status: t.status,
        href: `/tasks/${t.id}`,
      })),
    };
    return {
      timeline: buildTimeline(raw, now),
      actions: buildActions({ supa, now, work, proposals, decisions: raw.decisions ?? [] }),
    };
  }

  if (rootType === 'meeting') {
    const meeting = await getMeeting(rootId);
    if (!meeting) return null;
    const work = await loadWorkBySource(supa, 'meeting', rootId);
    const decisions = await decisionsForWork(supa, work);
    const raw: TimelineRaw = {
      sourceType: 'meeting',
      sourceId: rootId,
      origin: {
        id: meeting.id,
        title: meeting.topic,
        subtitle: meeting.summary,
        who: meeting.moderatorExecutiveId,
        when: meeting.createdAt,
        href: `/meetings/${meeting.id}`,
      },
      work: work.map(workToLineageItem),
      decisions,
      notApplicable: ['responses', 'reports', 'proposals'],
    };
    return {
      timeline: buildTimeline(raw, now),
      actions: buildActions({ supa, now, work, proposals: [], decisions }),
    };
  }

  if (rootType === 'instruction') {
    const instr = await loadInstructionById(supa, rootId);
    if (!instr) return null;
    const work = await loadWorkBySource(supa, 'instruction', rootId);
    const decisions = await decisionsForWork(supa, work);
    const raw: TimelineRaw = {
      sourceType: 'instruction',
      sourceId: rootId,
      origin: {
        id: instr.id,
        title: instr.instruction.slice(0, 120),
        subtitle: instr.instruction,
        who: instr.to_executive_id,
        when: instr.created_at,
      },
      work: work.map(workToLineageItem),
      decisions,
      notApplicable: ['responses', 'reports', 'proposals'],
    };
    const awaiting = instr.awaiting_ceo_input === true;
    const actions = buildActions({ supa, now, work, proposals: [], decisions });
    if (awaiting) {
      actions.ceoReply = {
        instructionId: instr.id,
        instruction: instr.instruction,
        question: instr.response ?? '',
      };
    }
    return { timeline: buildTimeline(raw, now), actions };
  }

  return null;
}

/** Build the reused-action targets from the resolved chain rows. */
function buildActions(args: {
  supa: Supa;
  now: string;
  work: WorkRow[];
  proposals: Array<{ id: string; payload: { title: string; description?: string | null }; status: string; sourceExecutiveId: string; createdAt: string }>;
  decisions: LineageItem[];
}): LineageActionTargets {
  const workRows = args.work.map((w) => workToActionRow(w, args.now));
  const decisionQueue: InspectorQueueItem[] = [];
  for (const p of args.proposals) {
    if (p.status !== 'proposed') continue;
    decisionQueue.push({
      kind: 'proposal',
      id: p.id,
      title: p.payload.title,
      description: p.payload.description ?? null,
      priority: null,
      status: p.status,
      dueDate: null,
      source: p.sourceExecutiveId,
      directiveId: null,
    });
  }
  for (const d of args.decisions) {
    if (d.status !== 'proposed') continue;
    decisionQueue.push({
      kind: 'decision',
      id: d.id,
      title: d.title,
      description: d.subtitle ?? null,
      priority: null,
      status: d.status ?? 'proposed',
      dueDate: null,
      source: d.who ?? null,
      directiveId: null,
    });
  }
  return { workRows, ceoReply: null, decisionQueue };
}
