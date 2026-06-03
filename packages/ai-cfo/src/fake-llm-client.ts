import type {
  CapitalAction,
  CfoOutput,
  CompanyContext,
  FinancialRiskCategory,
  ReportType,
  RevenueSignalKind,
} from '@ai-company/shared-types';
import type { CfoLlmClient } from './llm-client';

const REVENUE_METRIC_PATTERNS: Array<{ pattern: RegExp; kind: RevenueSignalKind }> = [
  { pattern: /mrr/i, kind: 'mrr' },
  { pattern: /arr/i, kind: 'arr' },
  { pattern: /(revenue|ticket|orders|sales|ils|usd|paying)/i, kind: 'revenue' },
  { pattern: /(prospect|pilot|pipeline|leads?|deals?)/i, kind: 'pipeline' },
  { pattern: /(cost|spend|burn)/i, kind: 'cost' },
  { pattern: /(ratio|mape|utilization|margin|cac|ltv|payback)/i, kind: 'unit_economic' },
];

function classifyMetric(name: string): RevenueSignalKind | null {
  for (const { pattern, kind } of REVENUE_METRIC_PATTERNS) {
    if (pattern.test(name)) return kind;
  }
  return null;
}

function categorizeRisk(text: string): FinancialRiskCategory {
  const lower = text.toLowerCase();
  if (lower.includes('renew') || lower.includes('churn') || lower.includes('downgrad')) return 'revenue';
  if (lower.includes('cost') || lower.includes('spend') || lower.includes('burn')) return 'cost';
  if (lower.includes('cash') || lower.includes('runway')) return 'cash';
  if (lower.includes('cac') || lower.includes('ltv') || lower.includes('payback') || lower.includes('margin'))
    return 'unit_economics';
  if (lower.includes('investment') || lower.includes('capital') || lower.includes('funding')) return 'capital';
  return 'revenue';
}

function looksFinance(text: string): boolean {
  return /(revenue|mrr|arr|customer|paying|renewal|churn|cost|burn|cash|runway|cac|ltv|margin|deal|pilot|conversion|capital|funding|prospect)/i.test(
    text,
  );
}

const ACTION_FOR_HEALTH: Record<string, CapitalAction> = {
  healthy: 'maintain',
  at_risk: 'monitor',
  critical: 'reduce',
  paused: 'monitor',
  archived: 'monitor',
};

/**
 * Deterministic CFO stand-in. Maps each project's metrics to revenue signals,
 * tags finance-flavored risks, and proposes a capital action per project based on health.
 * Used when ANTHROPIC_API_KEY isn't set — keeps demos working offline.
 */
export class FakeCfoLlmClient implements CfoLlmClient {
  async generate(ctx: CompanyContext, reportType: ReportType): Promise<CfoOutput> {
    const live = ctx.projects.filter(
      (p) => p.project.status !== 'archived' && p.project.status !== 'paused',
    );
    const financialHealth = live.some((p) => p.project.status === 'critical')
      ? 'critical'
      : live.some((p) => p.project.status === 'at_risk')
        ? 'at_risk'
        : 'healthy';

    const perProjectFinancials = ctx.projects.map((p) => {
      const tagged = p.latestMetrics
        .map((m) => {
          const kind = classifyMetric(m.name);
          if (!kind) return null;
          return {
            kind,
            name: m.name,
            value: m.value,
            ...(m.unit !== undefined ? { unit: m.unit } : {}),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      return {
        projectSlug: p.project.slug,
        health: p.project.status,
        summary: summarize(p),
        revenueSignals: tagged.slice(0, 5),
      };
    });

    const financialRisks = ctx.projects.flatMap((p) =>
      p.openRisks
        .filter((r) => looksFinance(r.description))
        .map((r) => ({
          projectSlug: p.project.slug,
          severity: r.severity,
          category: categorizeRisk(r.description),
          description: r.description,
          recommendedAction:
            r.severity === 'critical'
              ? 'Freeze incremental spend; meet with stakeholder this week.'
              : r.severity === 'high'
                ? 'Model scenario impact before next board cycle.'
                : 'Track in weekly finance review.',
        })),
    );

    const capitalAllocations = ctx.projects.map((p) => {
      const hasHighOpp = p.openOpportunities.some((o) => o.priority === 'high');
      const action: CapitalAction =
        p.project.status === 'critical'
          ? 'reduce'
          : hasHighOpp && p.project.status === 'healthy'
            ? 'invest'
            : p.project.status === 'at_risk'
              ? 'monitor'
              : (ACTION_FOR_HEALTH[p.project.status] ?? 'monitor');

      const rationale =
        action === 'invest'
          ? 'Healthy project with high-priority growth opportunity — capital deployed here compounds.'
          : action === 'reduce'
            ? 'Project status is critical; cut discretionary spend until stabilized.'
            : action === 'monitor'
              ? 'Mixed signal — hold current run-rate and reassess next cycle.'
              : 'On-plan — no allocation change recommended.';

      const estimatedImpact =
        action === 'invest'
          ? 'Material revenue lift if opportunity converts within 2 quarters.'
          : action === 'reduce'
            ? 'Cash preservation in the low single-digit % per month.'
            : 'Neutral cash impact.';

      return {
        projectSlug: p.project.slug,
        action,
        rationale,
        estimatedImpact,
      };
    });

    const investAllocations = capitalAllocations.filter((a) => a.action === 'invest');
    const reduceAllocations = capitalAllocations.filter((a) => a.action === 'reduce');

    const financialPriorities = [
      ...investAllocations.slice(0, 1).map((a, i) => ({
        rank: i + 1,
        title: `Increase investment in ${a.projectSlug}`,
        rationale: a.rationale,
      })),
      ...reduceAllocations.slice(0, 1).map((a, i) => ({
        rank: investAllocations.slice(0, 1).length + i + 1,
        title: `Reduce spend on ${a.projectSlug}`,
        rationale: a.rationale,
      })),
      ...financialRisks.slice(0, 1).map((r, i) => ({
        rank:
          investAllocations.slice(0, 1).length +
          reduceAllocations.slice(0, 1).length +
          i +
          1,
        title: `Mitigate ${r.category} risk on ${r.projectSlug}`,
        rationale: r.recommendedAction,
      })),
    ].slice(0, 3);

    const headlineBase =
      reportType === 'weekly_report'
        ? `Weekly finance read: ${live.length} project(s), ${financialRisks.length} financial risk(s), ${investAllocations.length} invest signal(s).`
        : `Finance briefing: ${live.length} project(s), ${financialRisks.length} financial risk(s).`;

    return {
      headline:
        financialHealth === 'critical'
          ? `${headlineBase} Finance: CRITICAL — see top risks.`
          : financialHealth === 'at_risk'
            ? `${headlineBase} Finance: at risk.`
            : `${headlineBase} Finance: healthy.`,
      financialHealth,
      cashSnapshot: {
        commentary:
          'No cash-position data ingested yet. Phase 2 will add a finance connector with bank + ledger feeds.',
      },
      perProjectFinancials,
      financialRisks: financialRisks.slice(0, 5),
      capitalAllocations,
      financialPriorities,
      generatedAt: new Date().toISOString(),
    };
  }
}

function summarize(p: CompanyContext['projects'][number]): string {
  const parts: string[] = [`Status: ${p.project.status}.`];
  const revenueMetrics = p.latestMetrics.filter((m) => classifyMetric(m.name));
  if (revenueMetrics.length > 0) {
    const top = revenueMetrics[0];
    if (top) parts.push(`Lead financial signal — ${top.name}: ${top.value}${top.unit ?? ''}.`);
  } else {
    parts.push('No financial signals yet exposed by the connector.');
  }
  return parts.join(' ');
}
