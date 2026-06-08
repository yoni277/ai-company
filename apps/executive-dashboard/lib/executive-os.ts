import 'server-only';

/**
 * D061 / P056.3–4 — Executive OS UI (Home + Inbox) server-side data loaders.
 *
 * Home and Inbox are server components. Per the established pattern (see
 * app/ceo/page.tsx) they read the platform repositories / lib helpers DIRECTLY
 * — no internal HTTP self-fetch (which the layout's prefetch={false} note shows
 * the team avoids). Mutations stay on the verified API routes (client side).
 *
 * Contract: docs/design/d061-ui-redesign/05-data-mapping-confirmed.md
 *   - decisions list        → listDecisions()                        [HAVE]
 *   - proposals list        → repos.taskProposals.listByStatus()     [HAVE]  (P056-RT-1: no HTTP route; server-read instead)
 *   - risks read            → repos.risks.listOpen()                 [HAVE]  (P056-RT-2: no HTTP route; server-read instead)
 *   - registry + health     → loadProjectRegistryView(portfolio)     [HAVE/DERIVED]
 *   - reports read          → repos.reports.list()                   [HAVE]
 *   - outcomes / wins       → repos.tasks.list({status:'completed'}) [HAVE/DERIVED]
 *
 * Everything is summary-first: bounded lists, newest-first, no all-data-on-load.
 */

import type {
  CEODecision,
  Risk,
  RiskSeverity,
  Task,
  TaskProposalRecord,
} from '@ai-company/shared-types';
import { getPlatform } from './platform';
import { listDecisions } from './ceo-operating-system';
import { loadProjectRegistryView } from './project-registry';
import { loadPortfolioIntelligenceForDashboard } from './portfolio-intelligence';
import {
  healthStateFromFunnel,
  type HealthState,
} from '../components/ds/StatusBadge';
import type { ActivityItem } from '../components/ds/ActivityFeed';

const SEVERITY_RANK: Record<RiskSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SEVERITY_STATE: Record<RiskSeverity, HealthState> = {
  critical: 'action',
  high: 'action',
  medium: 'attention',
  low: 'neutral',
};

/** One actionable item in the decision queue (a decision OR a pending proposal). */
export interface QueueItem {
  kind: 'decision' | 'proposal';
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string;
  dueDate: string | null;
  /** Executive that proposed it (proposals only). */
  source: string | null;
}

export interface RiskRow {
  id: string;
  description: string;
  severity: RiskSeverity;
  state: HealthState;
  status: string;
  recordedBy: string;
  generation: number;
  context: string | null;
}

export interface WinRow {
  id: string;
  title: string;
  completedAt: string | null;
  completedBy: string | null;
}

export interface ProjectHealthRow {
  name: string;
  slug: string;
  description: string;
  lifecycle: string;
  health: HealthState;
  bottleneck: string | null;
  openRecommendations: number;
}

export interface BriefingSummary {
  headline: string;
  summary: string;
  generatedAt: string | null;
  /** True when synthesized from live counts (no daily_briefing report yet). */
  computed: boolean;
}

function decisionToItem(d: CEODecision): QueueItem {
  return {
    kind: 'decision',
    id: d.id,
    title: d.decisionTitle,
    description: d.decisionDescription,
    priority: d.priority ?? null,
    status: d.decisionStatus,
    dueDate: d.dueDate,
    source: d.owner,
  };
}

function proposalToItem(p: TaskProposalRecord): QueueItem {
  const pr = p.payload.priority;
  return {
    kind: 'proposal',
    id: p.id,
    title: p.payload.title,
    description: p.payload.description ?? null,
    priority: pr ? pr.toUpperCase() : null,
    status: p.status,
    dueDate: null,
    source: p.sourceExecutiveId,
  };
}

function riskToRow(r: Risk, projectName: (id: string) => string | null): RiskRow {
  return {
    id: r.id,
    description: r.description,
    severity: r.severity,
    state: SEVERITY_STATE[r.severity],
    status: r.status,
    recordedBy: r.recordedBy,
    generation: r.generation,
    context: projectName(r.projectId),
  };
}

/** Build a project-id/slug → display-name resolver from the registry. */
function buildProjectNamer(
  projects: Array<{ id: string; slug: string; name: string }>,
): (id: string) => string | null {
  const byKey = new Map<string, string>();
  for (const p of projects) {
    byKey.set(p.id, p.name);
    byKey.set(p.slug, p.name);
  }
  return (id: string) => byKey.get(id) ?? null;
}

/** Proposed decisions + pending proposals, newest first. The CEO's queue. */
export async function loadDecisionQueue(): Promise<QueueItem[]> {
  const { repos } = getPlatform();
  const [decisions, proposals] = await Promise.all([
    listDecisions(),
    repos.taskProposals.listByStatus('proposed'),
  ]);
  const items = [
    ...decisions.filter((d) => d.decisionStatus === 'proposed').map(decisionToItem),
    ...proposals.map(proposalToItem),
  ];
  // Decisions carry createdAt; proposals carry createdAt too — but QueueItem
  // drops it. Sort the raw rows up front instead: proposals already newest via
  // repo; decisions filtered above. Keep proposals first (freshest asks), then
  // decisions. Deterministic, no clock read.
  return items;
}

/** Open risks, highest severity first. */
export async function loadOpenRisks(): Promise<RiskRow[]> {
  const { repos } = getPlatform();
  const [risks, projects] = await Promise.all([
    repos.risks.listOpen(),
    repos.projects.list(),
  ]);
  const namer = buildProjectNamer(projects);
  return risks
    .map((r) => riskToRow(r, namer))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/** Completed tasks, newest first (Recent Wins). */
export async function loadRecentWins(limit = 5): Promise<WinRow[]> {
  const { repos } = getPlatform();
  const completed = await repos.tasks.list({ status: 'completed' });
  return completed
    .slice()
    .sort((a: Task, b: Task) =>
      (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt),
    )
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      title: t.title,
      completedAt: t.completedAt,
      completedBy: t.completedBy,
    }));
}

/** Registry projects with DERIVED health (funnel status → 3-state + neutral). */
export async function loadProjectHealth(): Promise<ProjectHealthRow[]> {
  const { portfolio } = await loadPortfolioIntelligenceForDashboard();
  const { projects } = await loadProjectRegistryView(portfolio);
  return projects.map((row) => ({
    name: row.project.definition.name,
    slug: row.project.definition.slug,
    description: row.project.definition.description,
    lifecycle: row.project.definition.status,
    health: healthStateFromFunnel(row.funnelHealth),
    bottleneck: row.bottleneck,
    openRecommendations: row.openRecommendations,
  }));
}

/**
 * Activity Pulse v1 — client-union of created_at across existing reads
 * (decisions, proposals, risks, completed tasks, reports). A true event stream
 * is Wave-2 (P056-NS-2). Bounded + sorted newest-first here.
 */
export async function loadActivity(limit = 20): Promise<ActivityItem[]> {
  const { repos } = getPlatform();
  const [decisions, proposals, risks, completed, reports] = await Promise.all([
    listDecisions(),
    repos.taskProposals.listByStatus('proposed'),
    repos.risks.listOpen(),
    repos.tasks.list({ status: 'completed' }),
    repos.reports.list({ limit: 10 }),
  ]);

  const items: ActivityItem[] = [];
  for (const d of decisions) {
    items.push({ id: `dec-${d.id}`, kind: 'Decision', label: d.decisionTitle, at: d.createdAt });
  }
  for (const p of proposals) {
    items.push({ id: `prop-${p.id}`, kind: 'Proposal', label: p.payload.title, at: p.createdAt, context: p.sourceExecutiveId });
  }
  for (const r of risks) {
    items.push({
      id: `risk-${r.id}`,
      kind: 'Risk',
      label: r.description,
      at: r.createdAt,
      health: SEVERITY_STATE[r.severity],
    });
  }
  for (const t of completed) {
    items.push({ id: `task-${t.id}`, kind: 'Outcome', label: t.title, at: t.completedAt ?? t.updatedAt, health: 'healthy' });
  }
  for (const rep of reports) {
    items.push({ id: `rep-${rep.id}`, kind: 'Report', label: rep.summary, at: rep.createdAt, context: rep.executiveId });
  }

  return items
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

/** Latest daily briefing, or a deterministic synthesis from live counts. */
export async function loadBriefing(counts: {
  decisions: number;
  criticalRisks: number;
  healthyProjects: number;
  totalProjects: number;
}): Promise<BriefingSummary> {
  const { repos } = getPlatform();
  const reports = await repos.reports.list({ reportType: 'daily_briefing', limit: 1 });
  const latest = reports[0];
  if (latest) {
    const body = latest.body as { headline?: string } | null;
    return {
      headline: body?.headline ?? latest.summary,
      summary: latest.summary,
      generatedAt: latest.createdAt,
      computed: false,
    };
  }
  // No briefing yet — synthesize plain language from counts (empty-state-valid).
  const parts: string[] = [];
  parts.push(
    counts.decisions === 0
      ? 'No decisions are waiting on you right now.'
      : `${counts.decisions} ${counts.decisions === 1 ? 'decision needs' : 'decisions need'} your attention.`,
  );
  if (counts.criticalRisks > 0) {
    parts.push(`${counts.criticalRisks} critical ${counts.criticalRisks === 1 ? 'risk is' : 'risks are'} open.`);
  }
  if (counts.totalProjects > 0) {
    parts.push(`${counts.healthyProjects} of ${counts.totalProjects} projects are healthy.`);
  }
  const headline =
    counts.decisions === 0 && counts.criticalRisks === 0
      ? 'All clear — nothing needs you right now.'
      : counts.decisions > 0
        ? `${counts.decisions} ${counts.decisions === 1 ? 'decision needs' : 'decisions need'} you.`
        : 'Some risks need a look.';
  return { headline, summary: parts.join(' '), generatedAt: null, computed: true };
}

export interface HomeData {
  briefing: BriefingSummary;
  queue: QueueItem[];
  risks: RiskRow[];
  criticalRisks: RiskRow[];
  wins: WinRow[];
  activity: ActivityItem[];
  projects: ProjectHealthRow[];
  counts: {
    decisions: number;
    risks: number;
    criticalRisks: number;
    projects: number;
    healthyProjects: number;
    wins: number;
  };
}

export async function loadHomeData(): Promise<HomeData> {
  const [queue, risks, wins, activity, projects] = await Promise.all([
    loadDecisionQueue(),
    loadOpenRisks(),
    loadRecentWins(),
    loadActivity(),
    loadProjectHealth(),
  ]);
  const criticalRisks = risks.filter((r) => r.severity === 'critical' || r.severity === 'high');
  const healthyProjects = projects.filter((p) => p.health === 'healthy').length;
  const counts = {
    decisions: queue.length,
    risks: risks.length,
    criticalRisks: criticalRisks.length,
    projects: projects.length,
    healthyProjects,
    wins: wins.length,
  };
  const briefing = await loadBriefing({
    decisions: counts.decisions,
    criticalRisks: counts.criticalRisks,
    healthyProjects,
    totalProjects: counts.projects,
  });
  return { briefing, queue, risks, criticalRisks, wins, activity, projects, counts };
}

export interface InboxData {
  queue: QueueItem[];
  risks: RiskRow[];
}

export async function loadInboxData(): Promise<InboxData> {
  const [queue, risks] = await Promise.all([loadDecisionQueue(), loadOpenRisks()]);
  return { queue, risks };
}
