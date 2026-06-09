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
  meetings: Array<{ id: string; type: string; topic: string; status: string; createdAt: string }>;
  reports: Array<{ id: string; reportType: string; summary: string; createdAt: string }>;
  risks: Array<{ id: string; description: string; severity: string; status: string }>;
  objectives: Array<{ id: string; title: string; status: string }>;
  pendingDecisions: WorkItem[];
  kpis: { openWork: number; inProgress: number; done: number; overdue: number; pendingDecisions: number };
  timeline: Array<{ kind: string; label: string; at: string }>;
}

function isExecId(id: string): id is ExecId {
  return (EXECUTIVE_IDS as readonly string[]).includes(id);
}

function charterFor(name: string) {
  const c = ROLE_CHARTERS.find((r) => r.role === name);
  return c ? { stored: false as const, mandate: c.mandate, responsibilities: c.responsibilities, authority: c.authority } : null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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

  const [work, memory, meetings, reports, objectives, risks] = await Promise.all([
    supa
      .from('assigned_work')
      .select('*')
      .eq('owner_executive_id', executiveId)
      .eq('project_slug', projectSlug)
      .order('created_at', { ascending: false }),
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
  ]);

  const items: WorkItem[] = (work.data ?? []).map((w) => ({
    id: w.id,
    sourceType: w.source_type,
    title: w.title,
    detail: w.detail ?? '',
    approvalStatus: w.approval_status,
    executionStatus: w.execution_status,
    priority: w.priority,
    dueDate: w.due_date ?? null,
    createdAt: w.created_at,
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

  const today = todayISO();
  const kpis = {
    openWork: groups.approvedOpen.length,
    inProgress: groups.inProgress.length,
    done: groups.done.length,
    overdue: items.filter(
      (w) => w.approvalStatus === 'approved' && w.executionStatus !== 'done' && w.dueDate != null && w.dueDate < today,
    ).length,
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

  // Activity timeline — union of created_at across the surfaces (derived).
  const timeline = [
    ...items.map((w) => ({ kind: `work:${w.sourceType}`, label: w.title, at: w.createdAt })),
    ...meetingRows.map((mm) => ({ kind: 'meeting', label: mm.topic, at: mm.createdAt })),
    ...reportRows.map((r) => ({ kind: 'report', label: r.summary, at: r.createdAt })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 30);

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
