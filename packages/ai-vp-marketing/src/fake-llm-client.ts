import type {
  CompanyContext,
  MarketingFunnelStage,
  MarketingChannel,
  ReportType,
  VpMarketingOutput,
} from '@ai-company/shared-types';
import type { VpMarketingLlmClient } from './llm-client';

/**
 * Heuristic — map a metric NAME (not a project slug) to a funnel stage based
 * on generic keywords. These tokens classify connector-supplied metric names;
 * they do not branch on project identity. Keep the tokens generic.
 */
function stageFor(name: string): MarketingFunnelStage {
  const n = name.toLowerCase();
  if (/(impression|reach|view|awareness)/.test(n)) return 'awareness';
  if (/(signup|install|new[_-]?user|acquisition|truck|lab|consumer)/.test(n)) return 'acquisition';
  if (/(activation|first[_-]?|onboard|verified|approved)/.test(n)) return 'activation';
  if (/(retention|active|dau|wau|mau|return|repeat)/.test(n)) return 'retention';
  if (/(referral|share|favorite|rating)/.test(n)) return 'referral';
  if (/(revenue|mrr|arr|ticket|price|usd|ils|paying)/.test(n)) return 'revenue';
  return 'activation';
}

/**
 * Default channel pick for a project. Reads from instance-supplied metadata
 * (CompanyContext.projects[i].metadata?.marketingChannels). Falls back to
 * `'product'` when no metadata is registered — the platform never infers a
 * channel from project slug or name. See GENERIC_PLATFORM_BOUNDARY.md leak L3.
 */
function defaultChannel(
  project: CompanyContext['projects'][number],
): MarketingChannel {
  return project.metadata?.marketingChannels?.[0] ?? 'product';
}

/**
 * Deterministic VP Marketing stand-in. Builds a plausible report directly from
 * the CompanyContext so the dashboard demos without an LLM key.
 *
 * No project-specific channel map lives here — channel hints come from the
 * instance layer via the per-project metadata. Missing metadata → neutral
 * `'product'` channel.
 */
export class FakeVpMarketingLlmClient implements VpMarketingLlmClient {
  async generate(ctx: CompanyContext, reportType: ReportType): Promise<VpMarketingOutput> {
    const live = ctx.projects.filter(
      (p) => p.project.status !== 'archived' && p.project.status !== 'paused',
    );
    const marketingHealth = live.some((p) => p.project.status === 'critical')
      ? 'critical'
      : live.some((p) => p.project.status === 'at_risk')
        ? 'at_risk'
        : 'healthy';

    const perProjectMarketing = ctx.projects.map((p) => ({
      projectSlug: p.project.slug,
      health: p.project.status,
      summary: summarize(p),
      funnelMetrics: p.latestMetrics
        .filter((m) => isGrowthSignal(m.name))
        .slice(0, 4)
        .map((m) => ({
          stage: stageFor(m.name),
          name: m.name,
          value: m.value,
          ...(m.unit !== undefined ? { unit: m.unit } : {}),
          trend: 'unknown' as const,
        })),
    }));

    const campaignIdeas = ctx.projects.flatMap((p) =>
      p.openOpportunities.slice(0, 2).map((o) => ({
        projectSlug: p.project.slug,
        title: truncate(o.description, 60),
        channel: defaultChannel(p),
        priority: o.priority,
        description: o.description,
        expectedImpact:
          o.priority === 'high'
            ? 'Material lift in activation or revenue within 2 weeks.'
            : 'Incremental improvement in the next funnel stage.',
      })),
    );

    const growthRisks = ctx.projects.flatMap((p) =>
      p.openRisks
        .filter((r) => looksGrowth(r.description))
        .map((r) => ({
          projectSlug: p.project.slug,
          severity: r.severity,
          description: r.description,
          recommendedAction:
            r.severity === 'critical'
              ? 'Halt acquisition spend in affected channel; investigate today.'
              : r.severity === 'high'
                ? 'Run a 1-week experiment to validate cause; reroute budget.'
                : 'Add to weekly funnel review.',
        })),
    );

    const marketingPriorities = [
      ...campaignIdeas
        .filter((c) => c.priority === 'high')
        .slice(0, 2)
        .map((c, i) => ({
          rank: i + 1,
          title: `Run campaign on ${c.projectSlug}: ${truncate(c.title, 70)}`,
          rationale: `${c.channel} channel. ${c.expectedImpact}`,
        })),
      ...growthRisks.slice(0, 1).map((r, i) => ({
        rank:
          campaignIdeas.filter((c) => c.priority === 'high').slice(0, 2).length + i + 1,
        title: `Mitigate growth risk on ${r.projectSlug}`,
        rationale: r.recommendedAction,
      })),
    ].slice(0, 3);

    const headlineBase =
      reportType === 'weekly_report'
        ? `Weekly marketing read: ${live.length} project(s), ${campaignIdeas.length} candidate campaign(s), ${growthRisks.length} growth risk(s).`
        : `Marketing briefing: ${live.length} project(s), ${campaignIdeas.length} candidate campaign(s).`;

    return {
      headline:
        marketingHealth === 'critical'
          ? `${headlineBase} Marketing: CRITICAL — see growth risks.`
          : marketingHealth === 'at_risk'
            ? `${headlineBase} Marketing: at risk.`
            : `${headlineBase} Marketing: healthy.`,
      marketingHealth,
      perProjectMarketing,
      campaignIdeas: campaignIdeas.slice(0, 6),
      growthRisks: growthRisks.slice(0, 5),
      marketingPriorities,
      generatedAt: new Date().toISOString(),
    };
  }
}

function isGrowthSignal(name: string): boolean {
  return /(user|signup|active|favorite|rating|truck|paying|mrr|orders?|conversion|response|message|customer|consumer|ratio)/i.test(
    name,
  );
}

function looksGrowth(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('retention') ||
    lower.includes('churn') ||
    lower.includes('conversion') ||
    lower.includes('engagement') ||
    lower.includes('flight risk') ||
    lower.includes('campaign') ||
    lower.includes('customer')
  );
}

function summarize(p: CompanyContext['projects'][number]): string {
  const parts: string[] = [`Status: ${p.project.status}.`];
  const growthMetrics = p.latestMetrics.filter((m) => isGrowthSignal(m.name));
  if (growthMetrics.length > 0) {
    const top = growthMetrics[0];
    if (top) parts.push(`Lead signal — ${top.name}: ${top.value}${top.unit ?? ''}.`);
  }
  if (p.openOpportunities.length > 0) {
    parts.push(`${p.openOpportunities.length} growth opportunity(ies) open.`);
  }
  return parts.join(' ');
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
