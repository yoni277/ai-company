import type {
  CompanyContext,
  PipelineStage,
  ReportType,
  VpSalesOutput,
} from '@ai-company/shared-types';
import type { VpSalesLlmClient } from './llm-client';

const STAGE_PATTERNS: Array<{ pattern: RegExp; stage: PipelineStage }> = [
  { pattern: /(prospect|lead)/i, stage: 'prospect' },
  { pattern: /(qualified|sql|mql)/i, stage: 'qualified' },
  { pattern: /demo/i, stage: 'demo' },
  { pattern: /(pilot|trial)/i, stage: 'pilot' },
  { pattern: /(negotiation|contract|legal)/i, stage: 'negotiation' },
  { pattern: /(paying|customers|active_labs|won|closed_won|mrr|arr)/i, stage: 'closed_won' },
  { pattern: /(churned|closed_lost|lost)/i, stage: 'closed_lost' },
];

function classifyPipeline(name: string): PipelineStage | null {
  for (const { pattern, stage } of STAGE_PATTERNS) {
    if (pattern.test(name)) return stage;
  }
  return null;
}

function looksDeal(text: string): boolean {
  return /(customer|prospect|pilot|deal|account|renew|conversion|expansion|signed|trial|requested)/i.test(
    text,
  );
}

function looksSalesRisk(text: string): boolean {
  return /(churn|renew|conversion|customer|escalation|pilot|requested|expansion|downgrad)/i.test(
    text,
  );
}

/**
 * Deterministic VP Sales stand-in. Maps metrics to pipeline stages, treats high-priority
 * opportunities as candidate deals, and tags sales-flavored risks.
 */
export class FakeVpSalesLlmClient implements VpSalesLlmClient {
  async generate(ctx: CompanyContext, reportType: ReportType): Promise<VpSalesOutput> {
    const live = ctx.projects.filter(
      (p) => p.project.status !== 'archived' && p.project.status !== 'paused',
    );
    const salesHealth = live.some((p) => p.project.status === 'critical')
      ? 'critical'
      : live.some((p) => p.project.status === 'at_risk')
        ? 'at_risk'
        : 'healthy';

    const perProjectSales = ctx.projects.map((p) => {
      const tagged = p.latestMetrics
        .map((m) => {
          const stage = classifyPipeline(m.name);
          if (!stage) return null;
          return {
            stage,
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
        pipelineMetrics: tagged.slice(0, 5),
      };
    });

    const deals = ctx.projects.flatMap((p) =>
      p.openOpportunities
        .filter((o) => looksDeal(o.description))
        .map((o) => ({
          projectSlug: p.project.slug,
          title: truncate(o.description, 70),
          status: 'open' as const,
          nextAction:
            o.priority === 'high'
              ? 'Schedule discovery call this week.'
              : o.priority === 'medium'
                ? 'Send tailored follow-up; book demo in next 2 weeks.'
                : 'Nurture with monthly check-in.',
        })),
    );

    const salesRisks = ctx.projects.flatMap((p) =>
      p.openRisks
        .filter((r) => looksSalesRisk(r.description))
        .map((r) => ({
          projectSlug: p.project.slug,
          severity: r.severity,
          description: r.description,
          recommendedAction:
            r.severity === 'critical'
              ? 'Founder-led save-call before end of week; surface to board.'
              : r.severity === 'high'
                ? 'Run save play; assign CSM owner today.'
                : 'Track in weekly pipeline review.',
        })),
    );

    const salesPriorities = [
      ...deals.slice(0, 2).map((d, i) => ({
        rank: i + 1,
        title: `Advance deal: ${d.title} (${d.projectSlug})`,
        rationale: d.nextAction,
      })),
      ...salesRisks.slice(0, 1).map((r, i) => ({
        rank: deals.slice(0, 2).length + i + 1,
        title: `Save play on ${r.projectSlug}`,
        rationale: r.recommendedAction,
      })),
    ].slice(0, 3);

    const headlineBase =
      reportType === 'weekly_report'
        ? `Weekly pipeline read: ${live.length} project(s), ${deals.length} open deal(s), ${salesRisks.length} sales risk(s).`
        : `Sales briefing: ${live.length} project(s), ${deals.length} open deal(s).`;

    return {
      headline:
        salesHealth === 'critical'
          ? `${headlineBase} Sales: CRITICAL — see save plays.`
          : salesHealth === 'at_risk'
            ? `${headlineBase} Sales: at risk.`
            : `${headlineBase} Sales: healthy.`,
      salesHealth,
      forecastSummary: {
        commentary:
          'No CRM connector yet — quota progress not computed. Phase 2 will add Salesforce / HubSpot ingestion.',
      },
      perProjectSales,
      deals: deals.slice(0, 6),
      salesRisks: salesRisks.slice(0, 5),
      salesPriorities,
      generatedAt: new Date().toISOString(),
    };
  }
}

function summarize(p: CompanyContext['projects'][number]): string {
  const parts: string[] = [`Status: ${p.project.status}.`];
  const dealCandidates = p.openOpportunities.filter((o) => looksDeal(o.description)).length;
  if (dealCandidates > 0) parts.push(`${dealCandidates} candidate deal(s) in flow.`);
  const closedWonMetric = p.latestMetrics.find((m) => classifyPipeline(m.name) === 'closed_won');
  if (closedWonMetric) parts.push(`Customer signal — ${closedWonMetric.name}: ${closedWonMetric.value}${closedWonMetric.unit ?? ''}.`);
  return parts.join(' ');
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
