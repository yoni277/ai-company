import type { ChiefOfStaffOutput, CompanyContext, ReportType } from '@ai-company/shared-types';
import type { LlmClient } from './llm-client';
import { rollupCompanyHealth } from './analyzers/health';

/**
 * Deterministic LLM stand-in for demo + tests. Builds a plausible briefing
 * directly from the company context — no model call. Behaviour matches the
 * OpenAI client's output contract exactly.
 */
export class FakeLlmClient implements LlmClient {
  async generate(ctx: CompanyContext, reportType: ReportType): Promise<ChiefOfStaffOutput> {
    const companyHealth = rollupCompanyHealth(ctx.projects.map((p) => p.project.status));
    const liveProjects = ctx.projects.filter((p) => p.project.status !== 'archived');

    const allRisks = ctx.projects.flatMap((p) =>
      p.openRisks.map((r) => ({
        projectSlug: p.project.slug,
        severity: r.severity,
        description: r.description,
      })),
    );
    const sevRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    const topRisks = allRisks
      .sort((a, b) => sevRank[a.severity] - sevRank[b.severity])
      .slice(0, 5)
      .map((r) => ({
        ...r,
        recommendedAction:
          r.severity === 'critical'
            ? 'Convene incident review and assign single-threaded owner today.'
            : r.severity === 'high'
              ? 'Schedule 30-min review this week; pre-mortem mitigation options.'
              : 'Add to weekly review; no immediate action.',
      }));

    const allOpps = ctx.projects.flatMap((p) =>
      p.openOpportunities.map((o) => ({
        projectSlug: p.project.slug,
        priority: o.priority,
        description: o.description,
      })),
    );
    const prRank = { high: 0, medium: 1, low: 2 } as const;
    const topOpportunities = allOpps
      .sort((a, b) => prRank[a.priority] - prRank[b.priority])
      .slice(0, 5)
      .map((o) => ({
        ...o,
        recommendedAction:
          o.priority === 'high'
            ? 'Greenlight a 1-week scoping spike with named DRI.'
            : 'Discuss in next product review.',
      }));

    const ceoPriorities = [
      ...topRisks.slice(0, 2).map((r, i) => ({
        rank: i + 1,
        title: `Address ${r.severity} risk on ${r.projectSlug}: ${truncate(r.description, 80)}`,
        rationale: `Severity ${r.severity}. ${r.recommendedAction}`,
      })),
      ...topOpportunities.slice(0, 1).map((o) => ({
        rank: topRisks.slice(0, 2).length + 1,
        title: `Capture opportunity on ${o.projectSlug}: ${truncate(o.description, 80)}`,
        rationale: `Priority ${o.priority}. ${o.recommendedAction}`,
      })),
    ].slice(0, 3);

    const headlineBase =
      reportType === 'weekly_report'
        ? `Weekly read: ${liveProjects.length} live project(s), ${ctx.rollup.openRiskCount} open risk(s), ${ctx.rollup.openOpportunityCount} opportunity(ies).`
        : `Daily briefing: ${liveProjects.length} live project(s), ${ctx.rollup.openRiskCount} open risk(s).`;

    return {
      headline:
        companyHealth === 'critical'
          ? `${headlineBase} Company status: CRITICAL — see top risks.`
          : companyHealth === 'at_risk'
            ? `${headlineBase} Company status: at risk.`
            : `${headlineBase} Company status: healthy.`,
      companyHealth,
      perProject: ctx.projects.map((p) => ({
        projectSlug: p.project.slug,
        health: p.project.status,
        summary: summarizeProject(p),
        keyMetrics: p.latestMetrics.slice(0, 4).map((m) => ({
          name: m.name,
          value: m.value,
          ...(m.unit !== undefined ? { unit: m.unit } : {}),
        })),
      })),
      topRisks,
      topOpportunities,
      ceoPriorities,
      generatedAt: new Date().toISOString(),
    };
  }
}

function summarizeProject(p: CompanyContext['projects'][number]): string {
  const parts: string[] = [];
  parts.push(`Status: ${p.project.status}.`);
  if (p.openRisks.length > 0) parts.push(`${p.openRisks.length} open risk(s).`);
  if (p.openOpportunities.length > 0) parts.push(`${p.openOpportunities.length} opportunity(ies).`);
  if (p.latestMetrics.length > 0) {
    const headline = p.latestMetrics[0];
    if (headline) parts.push(`Latest ${headline.name}: ${headline.value}${headline.unit ?? ''}.`);
  }
  if (p.freshnessHours !== null && p.freshnessHours > 24) {
    parts.push(`Data is ${Math.round(p.freshnessHours)}h stale.`);
  }
  return parts.join(' ');
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
