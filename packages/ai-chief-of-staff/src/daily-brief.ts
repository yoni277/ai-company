import OpenAI from 'openai';
import type { DailyBrief, DailyBriefMetricsInput } from '@ai-company/shared-types';
import { formatFunnelSummary } from '@ai-company/business-funnel-engine';
import { formatRecommendedActionsBrief } from '@ai-company/decision-support-engine';
import { formatPortfolioSummary } from '@ai-company/portfolio-intelligence-engine';
import { formatFinancialOverviews } from '@ai-company/financial-intelligence-engine';
import { formatRevenueSummaries } from '@ai-company/revenue-intelligence-engine';
// NOTE: This package must remain instance-agnostic per
// docs/architecture/GENERIC_PLATFORM_BOUNDARY.md. The owner-acquisition prompt
// line and fallback summary are pre-computed at the instance layer (e.g. the
// dashboard's lib/owner-acquisition.ts) and passed in via
// DailyBriefMetricsInput.acquisitionSummary. Do not re-introduce an import
// from any connector-foodtruck-* / connector-lab-os-* / etc. here.

const EXPLAIN_ONLY_SYSTEM = `You are the AI Chief of Staff for a CEO daily brief.
You receive pre-computed metrics. Your job is to EXPLAIN them in plain language.
You must NOT invent, recalculate, or contradict the numbers provided.
Return JSON with keys: companyHealth (string), ownerAcquisitionSummary (string), funnelSummaries (string[]), recommendedActions (string[]), portfolioSummary (string), revenueSummaries (string[]), financialOverviews (string[]), ceoDirectives (string[]), openCeoDecisions (string[]), topRisks (string[]), opportunities (string[]), approvalsWaiting (string[]).`;

/**
 * Generate a CEO daily brief from pre-computed metrics.
 * AI explains — it does not calculate health scores or connector totals.
 */
export async function generateDailyBrief(
  metrics: DailyBriefMetricsInput,
): Promise<DailyBrief> {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      return await generateDailyBriefWithOpenAi(metrics, openAiKey);
    } catch {
      return deterministicDailyBrief(metrics);
    }
  }
  return deterministicDailyBrief(metrics);
}

async function generateDailyBriefWithOpenAi(
  metrics: DailyBriefMetricsInput,
  apiKey: string,
): Promise<DailyBrief> {
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const response = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      { role: 'system', content: EXPLAIN_ONLY_SYSTEM },
      { role: 'user', content: buildExplainPrompt(metrics) },
    ],
  });
  const raw = response.choices[0]?.message?.content;
  if (!raw) return deterministicDailyBrief(metrics);
  return normalizeDailyBrief(JSON.parse(raw) as unknown, metrics);
}

function buildExplainPrompt(m: DailyBriefMetricsInput): string {
  return [
    'Pre-computed metrics (do not change these values):',
    `Health score: ${m.health.score}/100 (${m.health.level})`,
    `GitHub repo: ${m.github.repositoryName}`,
    `GitHub open issues: ${m.github.openIssues}`,
    `GitHub open PRs: ${m.github.openPullRequests}`,
    `GitHub commits (7d): ${m.github.commitsLast7Days}`,
    `Supabase projects tracked: ${m.supabase.userCount}`,
    `Supabase recent activity (7d): ${m.supabase.recentActivityCount}`,
    `Supabase DB healthy: ${m.supabase.databaseHealthy}`,
    `Supabase metric writes (7d): ${m.supabase.transactionCount}`,
    `Pending approvals count: ${m.pendingApprovalCount}`,
    ownerAcquisitionPromptLine(m),
    funnelPromptLines(m),
    recommendedActionsPromptLines(m),
    portfolioSummaryPromptLine(m),
    revenueSummariesPromptLine(m),
    financialOverviewsPromptLine(m),
    ceoDirectivesPromptLine(m),
    openCeoDecisionsPromptLine(m),
    '',
    'Write a CEO brief: companyHealth (1-2 sentences), ownerAcquisitionSummary (one sentence; use the instance-supplied acquisition summary verbatim), funnelSummaries (one string per funnel, exact counts), recommendedActions (numbered lines, exact wording provided), portfolioSummary (one sentence, exact wording provided), revenueSummaries (one string per project, exact wording provided), financialOverviews (one string per project, exact wording provided), ceoDirectives (exact wording provided), openCeoDecisions (exact wording provided), topRisks (3 bullets max), opportunities (3 max), approvalsWaiting (list items or say none).',
  ].join('\n');
}

function normalizeDailyBrief(
  raw: unknown,
  metrics: DailyBriefMetricsInput,
): DailyBrief {
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const companyHealth =
      typeof o.companyHealth === 'string' ? o.companyHealth : fallbackHealth(metrics);
    const topRisks = stringArray(o.topRisks, fallbackRisks(metrics));
    const opportunities = stringArray(o.opportunities, fallbackOpportunities(metrics));
    const approvalsWaiting = stringArray(
      o.approvalsWaiting,
      metrics.pendingApprovalCount > 0
        ? [`${metrics.pendingApprovalCount} item(s) awaiting CEO approval`]
        : ['No pending approvals'],
    );
    const ownerAcquisitionSummary =
      typeof o.ownerAcquisitionSummary === 'string'
        ? o.ownerAcquisitionSummary
        : ownerSummaryFromInput(metrics);
    const funnelSummaries = funnelSummariesFromRaw(o.funnelSummaries, metrics);
    const recommendedActions = recommendedActionsFromRaw(o.recommendedActions, metrics);
    const portfolioSummary =
      typeof o.portfolioSummary === 'string'
        ? o.portfolioSummary
        : portfolioSummaryFromInput(metrics);
    const revenueSummaries = revenueSummariesFromRaw(o.revenueSummaries, metrics);
    const financialOverviews = financialOverviewsFromRaw(o.financialOverviews, metrics);
    const ceoDirectives = ceoDirectivesFromRaw(o.ceoDirectives, metrics);
    const openCeoDecisions = openCeoDecisionsFromRaw(o.openCeoDecisions, metrics);
    return {
      companyHealth,
      topRisks,
      opportunities,
      approvalsWaiting,
      ownerAcquisitionSummary,
      funnelSummaries,
      recommendedActions,
      portfolioSummary,
      revenueSummaries,
      financialOverviews,
      ceoDirectives,
      openCeoDecisions,
    };
  }
  return deterministicDailyBrief(metrics);
}

function ownerAcquisitionPromptLine(m: DailyBriefMetricsInput): string {
  // Pre-computed at the instance layer — see DailyBriefMetricsInput.acquisitionSummary.
  // The Chief of Staff intentionally has no knowledge of what business this
  // summary describes; it only renders the supplied strings.
  if (m.acquisitionSummary?.promptLine) return m.acquisitionSummary.promptLine;
  return 'Acquisition summary: not available.';
}

function ownerSummaryFromInput(m: DailyBriefMetricsInput): string {
  if (m.acquisitionSummary?.fallbackSummary) return m.acquisitionSummary.fallbackSummary;
  return 'Acquisition metrics not available.';
}

function funnelPromptLines(m: DailyBriefMetricsInput): string {
  if (!m.funnels?.length) return 'Funnel summaries: not available.';
  return m.funnels.map((f) => formatFunnelSummary(f)).join('\n');
}

function funnelSummariesFromInput(m: DailyBriefMetricsInput): string[] {
  if (!m.funnels?.length) return ['Funnel metrics not available.'];
  return m.funnels.map((f) => formatFunnelSummary(f));
}

function funnelSummariesFromRaw(v: unknown, metrics: DailyBriefMetricsInput): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  return funnelSummariesFromInput(metrics);
}

function recommendedActionsPromptLines(m: DailyBriefMetricsInput): string {
  if (!m.decisionSupport?.length) return 'Recommended actions: not available.';
  return formatRecommendedActionsBrief(m.decisionSupport).join('\n');
}

function recommendedActionsFromInput(m: DailyBriefMetricsInput): string[] {
  if (!m.decisionSupport?.length) return ['No recommended actions today.'];
  return formatRecommendedActionsBrief(m.decisionSupport);
}

function recommendedActionsFromRaw(v: unknown, metrics: DailyBriefMetricsInput): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  return recommendedActionsFromInput(metrics);
}

function portfolioSummaryPromptLine(m: DailyBriefMetricsInput): string {
  return `Portfolio summary: ${portfolioSummaryFromInput(m)}`;
}

function revenueSummariesPromptLine(m: DailyBriefMetricsInput): string {
  return formatRevenueSummaries(m.revenueSnapshots ?? []).join('\n');
}

function revenueSummariesFromInput(m: DailyBriefMetricsInput): string[] {
  if (!m.revenueSnapshots?.length) return ['Revenue data not available.'];
  return formatRevenueSummaries(m.revenueSnapshots);
}

function revenueSummariesFromRaw(v: unknown, metrics: DailyBriefMetricsInput): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  return revenueSummariesFromInput(metrics);
}

function financialOverviewsPromptLine(m: DailyBriefMetricsInput): string {
  return financialOverviewsFromInput(m).join('\n');
}

function financialOverviewsFromInput(m: DailyBriefMetricsInput): string[] {
  const fin = m.portfolioFinancial ?? m.portfolio?.financial ?? null;
  if (!fin) return ['Financial intelligence not available.'];
  return formatFinancialOverviews(fin);
}

function financialOverviewsFromRaw(v: unknown, metrics: DailyBriefMetricsInput): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  return financialOverviewsFromInput(metrics);
}

function ceoDirectivesFromInput(m: DailyBriefMetricsInput): string[] {
  if (!m.ceoDirectives?.length) return ['No active CEO directives.'];
  return m.ceoDirectives.map((d) => {
    const override = d.isOverride ? ' [OVERRIDE]' : '';
    const project = d.targetProjectId ? ` (${d.targetProjectId})` : '';
    return `${d.title}${override}${project}: ${d.directive}`;
  });
}

function openCeoDecisionsFromInput(m: DailyBriefMetricsInput): string[] {
  const open = (m.ceoDecisions ?? []).filter(
    (d) => d.decisionStatus === 'approved' || d.decisionStatus === 'in_progress',
  );
  if (!open.length) return ['No approved or in-progress CEO decisions.'];
  return open.map((d) => {
    const owner = d.owner ? ` · owner: ${d.owner}` : '';
    const due = d.dueDate ? ` · due: ${d.dueDate}` : '';
    return `[${d.decisionStatus}] ${d.decisionTitle}${owner}${due}`;
  });
}

function ceoDirectivesPromptLine(m: DailyBriefMetricsInput): string {
  return ceoDirectivesFromInput(m).join('\n');
}

function openCeoDecisionsPromptLine(m: DailyBriefMetricsInput): string {
  return openCeoDecisionsFromInput(m).join('\n');
}

function ceoDirectivesFromRaw(v: unknown, metrics: DailyBriefMetricsInput): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  return ceoDirectivesFromInput(metrics);
}

function openCeoDecisionsFromRaw(v: unknown, metrics: DailyBriefMetricsInput): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  return openCeoDecisionsFromInput(metrics);
}

function portfolioSummaryFromInput(m: DailyBriefMetricsInput): string {
  if (!m.portfolio) return 'Portfolio intelligence not available.';
  const detail = m.portfolioTopProjectBriefDetail;
  return formatPortfolioSummary(
    m.portfolio,
    detail !== undefined ? { topProjectBriefDetail: detail } : undefined,
  );
}

function stringArray(v: unknown, fallback: string[]): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  return fallback;
}

/** Used when no LLM key is configured or the model call fails. */
export function deterministicDailyBrief(metrics: DailyBriefMetricsInput): DailyBrief {
  const g = metrics.github;
  const s = metrics.supabase;
  return {
    companyHealth: `Company health score is ${metrics.health.score}/100 (${metrics.health.level}). GitHub shows ${g.openIssues} open issues and ${g.commitsLast7Days} commits in the last 7 days on ${g.repositoryName}. Supabase reports ${s.recentActivityCount} recent activity events; database ${s.databaseHealthy ? 'is healthy' : 'needs attention'}.`,
    topRisks: [
      g.openIssues > 10
        ? `Elevated open issue count (${g.openIssues}) on GitHub.`
        : `GitHub issue backlog is ${g.openIssues} — within normal range.`,
      metrics.health.level === 'red'
        ? 'Health score is in the red zone — review critical issues and deployments.'
        : 'No critical health score alert.',
      !s.databaseHealthy
        ? 'Supabase database health check failed.'
        : 'Platform database is responding normally.',
    ],
    opportunities: [
      g.commitsLast7Days > 15
        ? `Strong engineering velocity: ${g.commitsLast7Days} commits this week.`
        : 'Consider increasing commit cadence if releases are due.',
      g.openPullRequests > 0
        ? `${g.openPullRequests} open PR(s) ready for review.`
        : 'No open pull requests blocking delivery.',
      s.recentActivityCount > 20
        ? 'High platform activity — good signal for portfolio monitoring.'
        : 'Platform activity is quiet — verify connectors are syncing.',
    ],
    approvalsWaiting:
      metrics.pendingApprovalCount > 0
        ? [`${metrics.pendingApprovalCount} approval(s) need CEO attention today.`]
        : ['No pending approvals.'],
    ownerAcquisitionSummary: ownerSummaryFromInput(metrics),
    funnelSummaries: funnelSummariesFromInput(metrics),
    recommendedActions: recommendedActionsFromInput(metrics),
    portfolioSummary: portfolioSummaryFromInput(metrics),
    revenueSummaries: revenueSummariesFromInput(metrics),
    financialOverviews: financialOverviewsFromInput(metrics),
    ceoDirectives: ceoDirectivesFromInput(metrics),
    openCeoDecisions: openCeoDecisionsFromInput(metrics),
  };
}

function fallbackHealth(m: DailyBriefMetricsInput): string {
  return `Health score ${m.health.score}/100 (${m.health.level}).`;
}

function fallbackRisks(m: DailyBriefMetricsInput): string[] {
  return deterministicDailyBrief(m).topRisks;
}

function fallbackOpportunities(m: DailyBriefMetricsInput): string[] {
  return deterministicDailyBrief(m).opportunities;
}
