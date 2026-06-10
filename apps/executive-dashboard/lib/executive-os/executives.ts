import 'server-only';

/**
 * L31 — Executive Command Center: workspace read-aggregation (spec §1).
 *
 * Composes everything an executive holds for ONE business, scoped strictly by
 * (executive_id, project_slug). A read surface over the existing spine — no new
 * store. Derived projections (KPIs, timeline) are computed from live reads,
 * never duplicated. assigned_work is the one work spine (directive / meeting /
 * instruction all converge into the same board).
 */

import { getSupabaseAdmin } from '../doos/supabase-admin';
import { ROLE_CHARTERS } from '../build-zone-data';
import { loadWorkMasterList } from './work-control';
import type { WorkListItem } from './work-control-core';
import type { WorkState } from './work-state';

export const EXECUTIVE_IDS = ['chief-of-staff', 'cto', 'coo', 'cfo', 'vp-marketing', 'vp-sales'] as const;
export type ExecId = (typeof EXECUTIVE_IDS)[number];

const ROLE_LABEL: Record<ExecId, string> = {
  'chief-of-staff': 'Chief of Staff',
  cto: 'CTO',
  coo: 'COO',
  cfo: 'CFO',
  'vp-marketing': 'VP Marketing',
  'vp-sales': 'VP Sales',
};

export interface WorkItem {
  id: string;
  sourceType: string;
  title: string;
  detail: string;
  approvalStatus: string;
  executionStatus: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
}

/** EPIC-004 Phase 6 — Performance, from the spine + AC13 aging. No fake metrics. */
export interface PerformanceStats {
  assigned: number;
  completed: number;
  blocked: number;
  overdue: number;
  averageAgeDays: number; // avg age of non-terminal (live) work; 0 when none
  oldestOpen: { id: string; title: string; ageDays: number } | null;
}

export interface InstructionItem {
  id: string;
  instruction: string;
  status: string;
  awaitingCeoInput: boolean;
  /** OF-005 — the executive's latest output: its clarifying question when awaiting, else its answer. */
  question: string;
  createdAt: string;
}

export interface DecisionItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

/** EPIC-004 Phase 6 — Communication block. */
export interface CommunicationBlock {
  pendingInstructions: InstructionItem[];
  pendingQuestions: InstructionItem[]; // awaiting_ceo_input (L34)
  pendingApprovals: number; // proposed work in the approval gate
  recentMeetings: Array<{ id: string; type: string; topic: string; status: string; createdAt: string }>;
  recentDecisions: DecisionItem[];
}

export interface WorkspacePayload {
  executiveId: ExecId;
  executiveName: string;
  projectSlug: string;
  projectName: string | null;
  charter: { stored: false; mandate: string; responsibilities: string[]; authority: string[] } | null;
  memory: { currentStrategy: string | null; knownAssumptions: unknown[]; updatedAt: string | null; updatedBy: string | null } | null;
  assignedWork: {
    items: WorkItem[];
    groups: { proposed: WorkItem[]; approvedOpen: WorkItem[]; inProgress: WorkItem[]; done: WorkItem[]; other: WorkItem[] };
  };
  /**
   * EPIC-004 Phase 6 — Current Work, classified by the SAME work-control-core
   * selector /work and /situation use (guaranteed via loadWorkMasterList filtered
   * to this owner). byState buckets the items by the shared five+ states with the
   * same daysInCurrentState — the three lenses never disagree about an item.
   */
  currentWork: {
    items: WorkListItem[];
    byState: Partial<Record<WorkState, WorkListItem[]>>;
  };
  performance: PerformanceStats;
  communication: CommunicationBlock;
  meetings: Array<{ id: string; type: string; topic: string; status: string; createdAt: string }>;
  reports: Array<{ id: string; reportType: string; summary: string; createdAt: string }>;
  risks: Array<{ id: string; description: string; severity: string; status: string }>;
  objectives: Array<{ id: string; title: string; status: string }>;
  pendingDecisions: WorkItem[];
  kpis: { openWork: number; inProgress: number; done: number; overdue: number; pendingDecisions: number };
  timeline: Array<{ kind: string; label: string; at: string }>;
}

const TERMINAL_STATES: readonly WorkState[] = ['done', 'cancelled', 'rejected'];

function isExecId(id: string): id is ExecId {
  return (EXECUTIVE_IDS as readonly string[]).includes(id);
}

function charterFor(name: string) {
  const c = ROLE_CHARTERS.find((r) => r.role === name);
  return c ? { stored: false as const, mandate: c.mandate, responsibilities: c.responsibilities, authority: c.authority } : null;
}

export async function loadExecutiveWorkspace(
  executiveId: string,
  projectSlug: string,
): Promise<WorkspacePayload | null> {
  if (!isExecId(executiveId)) return null;
  const supa = getSupabaseAdmin();

  // Business must exist + be enabled (scope guard).
  const { data: biz } = await supa
    .from('project_definitions')
    .select('slug, name')
    .eq('slug', projectSlug)
    .eq('enabled', true)
    .maybeSingle();
  if (!biz) return null;

  // Resolve legacy project id for risk scoping.
  const { data: legacy } = await supa.from('projects').select('id').eq('slug', projectSlug).maybeSingle();

  const [workItems, memory, meetings, reports, objectives, risks, instructions, decisions] = await Promise.all([
    // EPIC-004 Phase 6 — the SAME classifier/aging as /work and /situation, scoped
    // to this owner. Guarantees the three lenses agree about every work item.
    loadWorkMasterList({ ownerExecutiveId: executiveId, projectSlug }),
    supa
      .from('executive_memory')
      .select('*')
      .eq('executive_id', executiveId)
      .eq('project_slug', projectSlug)
      .maybeSingle(),
    supa
      .from('meetings')
      .select('id, type, topic, status, created_at, participants')
      .eq('project_slug', projectSlug)
      .contains('participants', [executiveId])
      .order('created_at', { ascending: false })
      .limit(25),
    supa
      .from('executive_reports')
      .select('id, report_type, summary, created_at')
      .eq('executive_id', executiveId)
      .order('created_at', { ascending: false })
      .limit(10),
    supa
      .from('objectives')
      .select('id, title, status')
      .eq('owner_id', executiveId)
      .limit(25),
    legacy?.id
      ? supa.from('risks').select('id, description, severity, status').eq('recorded_by', executiveId).eq('project_id', legacy.id).limit(25)
      : Promise.resolve({ data: [] as Array<{ id: string; description: string; severity: string; status: string }> }),
    supa
      .from('direct_instructions')
      .select('id, instruction, status, awaiting_ceo_input, response, created_at')
      .eq('to_executive_id', executiveId)
      .eq('project_slug', projectSlug)
      .order('created_at', { ascending: false })
      .limit(25),
    supa
      .from('ceo_decisions')
      .select('id, decision_title, decision_status, created_at')
      .eq('owner', executiveId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // --- Current Work: bucket the SHARED-classifier rows by state (no second logic). ---
  const byState: Partial<Record<WorkState, WorkListItem[]>> = {};
  for (const w of workItems) (byState[w.state] ??= []).push(w);

  // --- Backward-compat shapes (existing L31 UI), now derived from the same rows. ---
  const items: WorkItem[] = workItems.map((w) => ({
    id: w.id,
    sourceType: w.sourceType,
    title: w.title,
    detail: w.detail ?? '',
    approvalStatus: w.approvalStatus,
    executionStatus: w.executionStatus,
    priority: w.priority,
    dueDate: w.dueDate,
    createdAt: w.createdAt,
  }));
  const groups = {
    proposed: items.filter((w) => w.approvalStatus === 'proposed'),
    approvedOpen: items.filter((w) => w.approvalStatus === 'approved' && w.executionStatus === 'open'),
    inProgress: items.filter((w) => w.approvalStatus === 'approved' && w.executionStatus === 'in_progress'),
    done: items.filter((w) => w.executionStatus === 'done'),
    other: items.filter(
      (w) =>
        !(w.approvalStatus === 'proposed') &&
        !(w.approvalStatus === 'approved' && (w.executionStatus === 'open' || w.executionStatus === 'in_progress')) &&
        w.executionStatus !== 'done',
    ),
  };

  // --- Performance: real spine numbers only (AC13 aging). Honest zeros on empty. ---
  const live = workItems.filter((w) => !TERMINAL_STATES.includes(w.state));
  const averageAgeDays =
    live.length > 0 ? Math.round(live.reduce((s, w) => s + w.ageDays, 0) / live.length) : 0;
  const oldest = live.reduce<WorkListItem | null>(
    (max, w) => (max === null || w.ageDays > max.ageDays ? w : max),
    null,
  );
  const performance: PerformanceStats = {
    assigned: workItems.length,
    completed: (byState.done ?? []).length,
    blocked: (byState.blocked ?? []).length,
    overdue: (byState.overdue ?? []).length,
    averageAgeDays,
    oldestOpen: oldest ? { id: oldest.id, title: oldest.title, ageDays: oldest.ageDays } : null,
  };

  const kpis = {
    openWork: groups.approvedOpen.length,
    inProgress: groups.inProgress.length,
    done: performance.completed,
    overdue: performance.overdue,
    pendingDecisions: groups.proposed.length,
  };

  const meetingRows = (meetings.data ?? []).map((mm) => ({
    id: mm.id,
    type: mm.type,
    topic: mm.topic,
    status: mm.status,
    createdAt: mm.created_at,
  }));
  const reportRows = (reports.data ?? []).map((r) => ({
    id: r.id,
    reportType: r.report_type,
    summary: r.summary,
    createdAt: r.created_at,
  }));

  // --- Communication ---
  const ACTIVE_INSTR = new Set(['sent', 'acknowledged', 'in_progress']);
  const instrItems: InstructionItem[] = (instructions.data ?? []).map((i) => ({
    id: i.id,
    instruction: (i.instruction as string).slice(0, 160),
    status: i.status,
    awaitingCeoInput: i.awaiting_ceo_input ?? false,
    question: (i.response as string | null) ?? '',
    createdAt: i.created_at,
  }));
  const decisionItems: DecisionItem[] = (decisions.data ?? []).map((d) => ({
    id: d.id,
    title: d.decision_title,
    status: d.decision_status,
    createdAt: d.created_at,
  }));
  const communication: CommunicationBlock = {
    pendingInstructions: instrItems.filter((i) => ACTIVE_INSTR.has(i.status)),
    pendingQuestions: instrItems.filter((i) => i.awaitingCeoInput),
    pendingApprovals: (byState.needs_ceo_completion ?? []).length + (byState.awaiting_approval ?? []).length,
    recentMeetings: meetingRows.slice(0, 8),
    recentDecisions: decisionItems,
  };

  // --- Timeline — union of created_at + status_changed_at across the surfaces. ---
  const timeline = [
    ...workItems.map((w) => ({ kind: `work:${w.sourceType}`, label: w.title, at: w.createdAt })),
    ...workItems
      .filter((w) => w.statusChangedAt && w.statusChangedAt !== w.createdAt)
      .map((w) => ({ kind: `work-status:${w.state}`, label: w.title, at: w.statusChangedAt })),
    ...meetingRows.map((mm) => ({ kind: 'meeting', label: mm.topic, at: mm.createdAt })),
    ...reportRows.map((r) => ({ kind: 'report', label: r.summary, at: r.createdAt })),
    ...instrItems.map((i) => ({
      kind: i.awaitingCeoInput ? 'question' : 'instruction',
      label: i.instruction,
      at: i.createdAt,
    })),
    ...decisionItems.map((d) => ({ kind: 'decision', label: d.title, at: d.createdAt })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 40);

  return {
    executiveId,
    executiveName: ROLE_LABEL[executiveId],
    projectSlug,
    projectName: biz.name ?? null,
    charter: charterFor(ROLE_LABEL[executiveId]),
    memory: memory.data
      ? {
          currentStrategy: memory.data.current_strategy ?? null,
          knownAssumptions: memory.data.known_assumptions ?? [],
          updatedAt: memory.data.updated_at ?? null,
          updatedBy: memory.data.updated_by ?? null,
        }
      : null,
    assignedWork: { items, groups },
    currentWork: { items: workItems, byState },
    performance,
    communication,
    meetings: meetingRows,
    reports: reportRows,
    risks: risks.data ?? [],
    objectives: objectives.data ?? [],
    pendingDecisions: groups.proposed,
    kpis,
    timeline,
  };
}

/** L31 §3 — CEO-curated memory. Composite-PK upsert (no dupes); scoped + audited. */
export async function upsertExecutiveMemory(
  executiveId: string,
  projectSlug: string,
  input: { currentStrategy: string | null; knownAssumptions: unknown[] },
): Promise<void> {
  if (!isExecId(executiveId)) throw new Error(`Unknown executive '${executiveId}'`);
  const supa = getSupabaseAdmin();
  const { data: biz } = await supa
    .from('project_definitions')
    .select('slug')
    .eq('slug', projectSlug)
    .eq('enabled', true)
    .maybeSingle();
  if (!biz) throw new Error(`Unknown or disabled business '${projectSlug}'`);
  const { error } = await supa.from('executive_memory').upsert(
    {
      executive_id: executiveId,
      project_slug: projectSlug,
      current_strategy: input.currentStrategy,
      known_assumptions: input.knownAssumptions,
      updated_by: 'ceo',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'executive_id,project_slug' },
  );
  if (error) throw new Error(error.message);
}

export interface ExecutiveDirectoryCard {
  executiveId: ExecId;
  executiveName: string;
  strategy: string | null;
  openWork: number;
  pendingDecisions: number;
  lastActivity: string | null;
}

/** Directory: 6 execs + per-exec rollups for a business. */
export async function loadExecutiveDirectory(projectSlug: string): Promise<ExecutiveDirectoryCard[]> {
  const supa = getSupabaseAdmin();
  const cards: ExecutiveDirectoryCard[] = [];
  for (const id of EXECUTIVE_IDS) {
    const [{ data: work }, { data: mem }] = await Promise.all([
      supa
        .from('assigned_work')
        .select('approval_status, execution_status, created_at')
        .eq('owner_executive_id', id)
        .eq('project_slug', projectSlug),
      supa
        .from('executive_memory')
        .select('current_strategy')
        .eq('executive_id', id)
        .eq('project_slug', projectSlug)
        .maybeSingle(),
    ]);
    const rows = work ?? [];
    cards.push({
      executiveId: id,
      executiveName: ROLE_LABEL[id],
      strategy: mem?.current_strategy ?? null,
      openWork: rows.filter((w) => w.approval_status === 'approved' && w.execution_status !== 'done').length,
      pendingDecisions: rows.filter((w) => w.approval_status === 'proposed').length,
      lastActivity: rows.map((w) => w.created_at).sort().reverse()[0] ?? null,
    });
  }
  return cards;
}
