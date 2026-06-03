import OpenAI from 'openai';
import type { DailyBrief, DailyBriefMetricsInput } from '@ai-company/shared-types';
import { buildOwnerAcquisitionSummary } from '@ai-company/connector-foodtruck-business';

const EXPLAIN_ONLY_SYSTEM = `You are the AI Chief of Staff for a CEO daily brief.
You receive pre-computed metrics. Your job is to EXPLAIN them in plain language.
You must NOT invent, recalculate, or contradict the numbers provided.
Return JSON with keys: companyHealth (string), ownerAcquisitionSummary (string), topRisks (string[]), opportunities (string[]), approvalsWaiting (string[]).`;

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
    '',
    'Write a CEO brief: companyHealth (1-2 sentences), ownerAcquisitionSummary (one sentence with exact truck counts), topRisks (3 bullets max), opportunities (3 max), approvalsWaiting (list items or say none).',
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
    return { companyHealth, topRisks, opportunities, approvalsWaiting, ownerAcquisitionSummary };
  }
  return deterministicDailyBrief(metrics);
}

function ownerAcquisitionPromptLine(m: DailyBriefMetricsInput): string {
  if (!m.foodTruck) return 'Owner acquisition: not available.';
  const r = m.foodTruck.registry;
  const a = m.foodTruck.acquisition;
  return `FoodTruck: ${r.totalRegisteredTrucks} registered, ${r.approvedTrucks} approved, ${r.pendingTrucks} pending, activation ${a.activationRate}%.`;
}

function ownerSummaryFromInput(m: DailyBriefMetricsInput): string {
  if (!m.foodTruck) return 'Owner acquisition metrics not available.';
  return buildOwnerAcquisitionSummary(m.foodTruck);
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
