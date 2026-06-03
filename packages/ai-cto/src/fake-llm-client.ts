import type { CompanyContext, CtoOutput, ReportType } from '@ai-company/shared-types';
import type { CtoLlmClient } from './llm-client';

/**
 * Deterministic CTO stand-in. Derives a plausible engineering report from the
 * same CompanyContext the Chief of Staff sees, but through a technical lens.
 */
export class FakeCtoLlmClient implements CtoLlmClient {
  async generate(ctx: CompanyContext, reportType: ReportType): Promise<CtoOutput> {
    const live = ctx.projects.filter(
      (p) => p.project.status !== 'archived' && p.project.status !== 'paused',
    );

    const platformHealth = live.some((p) => p.project.status === 'critical')
      ? 'critical'
      : live.some((p) => p.project.status === 'at_risk')
        ? 'at_risk'
        : 'healthy';

    const technicalRisks = ctx.projects.flatMap((p) =>
      p.openRisks
        .filter((r) => looksTechnical(r.description))
        .map((r) => ({
          projectSlug: p.project.slug,
          severity: r.severity,
          category: categorize(r.description),
          description: r.description,
          recommendedAction:
            r.severity === 'critical'
              ? 'Page on-call; convene incident bridge today.'
              : r.severity === 'high'
                ? 'Spike investigation this week; pre-mortem mitigation paths.'
                : 'Track in next engineering review.',
        })),
    );

    const techDebtItems = ctx.projects.flatMap((p) =>
      p.openOpportunities
        .filter((o) => looksTechDebt(o.description))
        .map((o) => ({
          projectSlug: p.project.slug,
          title: truncate(o.description, 60),
          impact: o.priority,
          description: o.description,
        })),
    );

    const engineeringPriorities = [
      ...technicalRisks.slice(0, 2).map((r, i) => ({
        rank: i + 1,
        title: `Resolve ${r.severity} ${r.category} risk on ${r.projectSlug}: ${truncate(r.description, 60)}`,
        rationale: r.recommendedAction,
      })),
      ...techDebtItems.slice(0, 1).map((d) => ({
        rank: technicalRisks.slice(0, 2).length + 1,
        title: `Pay down: ${d.title}`,
        rationale: `${d.impact} impact. ${truncate(d.description, 80)}`,
      })),
    ].slice(0, 3);

    const headlineBase =
      reportType === 'weekly_report'
        ? `Weekly engineering read: ${live.length} project(s), ${technicalRisks.length} technical risk(s) open.`
        : `Engineering briefing: ${live.length} project(s), ${technicalRisks.length} technical risk(s) open.`;

    return {
      headline:
        platformHealth === 'critical'
          ? `${headlineBase} Platform: CRITICAL — see top risks.`
          : platformHealth === 'at_risk'
            ? `${headlineBase} Platform: at risk.`
            : `${headlineBase} Platform: healthy.`,
      platformHealth,
      perProjectEngineering: ctx.projects.map((p) => ({
        projectSlug: p.project.slug,
        health: p.project.status,
        summary: technicalSummary(p),
        technicalSignals: p.latestMetrics
          .filter((m) => isTechnicalSignal(m.name))
          .slice(0, 4)
          .map((m) => ({
            name: m.name,
            value: m.value,
            ...(m.unit !== undefined ? { unit: m.unit } : {}),
          })),
      })),
      topTechnicalRisks: technicalRisks.slice(0, 5),
      techDebtItems: techDebtItems.slice(0, 5),
      engineeringPriorities,
      generatedAt: new Date().toISOString(),
    };
  }
}

const TECH_KEYWORDS = [
  'latency',
  'queue',
  'ingestion',
  'p99',
  'incident',
  'error',
  'outage',
  'scaling',
  'capacity',
  'database',
  'index',
  'storage',
  'cold-storage',
  'tracking',
  'analytics',
  'engine',
  'integration',
];

function looksTechnical(text: string): boolean {
  const lower = text.toLowerCase();
  return TECH_KEYWORDS.some((k) => lower.includes(k));
}

function looksTechDebt(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('cold-storage') ||
    lower.includes('index') ||
    lower.includes('refactor') ||
    lower.includes('integration') ||
    lower.includes('migration')
  );
}

function categorize(text: string): 'infrastructure' | 'security' | 'reliability' | 'performance' | 'tech_debt' {
  const lower = text.toLowerCase();
  if (lower.includes('security') || lower.includes('auth') || lower.includes('breach')) return 'security';
  if (lower.includes('latency') || lower.includes('p99') || lower.includes('throughput')) return 'performance';
  if (lower.includes('incident') || lower.includes('outage') || lower.includes('escalation')) return 'reliability';
  if (lower.includes('cold-storage') || lower.includes('refactor') || lower.includes('migration')) return 'tech_debt';
  return 'infrastructure';
}

function isTechnicalSignal(name: string): boolean {
  return /(latency|p99|throughput|incidents?|queue|errors?|quota|active|skus|connected)/i.test(
    name,
  );
}

function technicalSummary(p: CompanyContext['projects'][number]): string {
  const techRisks = p.openRisks.filter((r) => looksTechnical(r.description));
  const parts: string[] = [`Status: ${p.project.status}.`];
  if (techRisks.length > 0) {
    parts.push(`${techRisks.length} open technical risk(s).`);
  } else {
    parts.push('No open technical risks recorded.');
  }
  if (p.freshnessHours !== null && p.freshnessHours > 24) {
    parts.push(`Signal freshness: ${Math.round(p.freshnessHours)}h.`);
  }
  return parts.join(' ');
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
