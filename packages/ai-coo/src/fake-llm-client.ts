import type {
  CompanyContext,
  CooOutput,
  OperationalMetricKind,
  ReportType,
  VendorStatus,
} from '@ai-company/shared-types';
import type { CooLlmClient } from './llm-client';

const OPS_PATTERNS: Array<{ pattern: RegExp; kind: OperationalMetricKind }> = [
  { pattern: /(p99|p95|response[_-]?time|first[_-]?response|sla|on[_-]?time|dispatch[_-]?rate)/i, kind: 'sla' },
  { pattern: /(queue|backlog|pending|approval)/i, kind: 'queue' },
  { pattern: /(utilization|quota|capacity)/i, kind: 'utilization' },
  { pattern: /(vendor|meta|wolt|cibus|paybox)/i, kind: 'vendor' },
  { pattern: /(throughput|orders?|events?|samples?|messages?|active|trucks?|labs?)/i, kind: 'throughput' },
];

function classifyOps(name: string): OperationalMetricKind | null {
  for (const { pattern, kind } of OPS_PATTERNS) {
    if (pattern.test(name)) return kind;
  }
  return null;
}

const PROJECT_VENDORS: Record<string, Array<{ vendor: string; metricHint?: RegExp }>> = {
  'foodtruck-il': [
    { vendor: 'Wolt (delivery)' },
    { vendor: 'Supabase (data)' },
  ],
  'lab-os': [{ vendor: 'Supabase (data)' }, { vendor: 'LIMS integrations' }],
  'whatsapp-engine': [{ vendor: 'Meta WhatsApp Cloud API', metricHint: /meta_quota|template/i }],
  'inventory-engine': [{ vendor: 'Connected consumer services', metricHint: /connected_consumers/i }],
};

function looksOps(text: string): boolean {
  return /(queue|backlog|incident|outage|sla|throughput|response|approval|vendor|wolt|meta|quota|integration|escalation)/i.test(
    text,
  );
}

/**
 * Deterministic COO stand-in. Tags metrics by operational kind, derives bottlenecks from
 * platform risks that read as operational, and builds a per-project vendor health view
 * from project-specific hints. Used when ANTHROPIC_API_KEY isn't set.
 */
export class FakeCooLlmClient implements CooLlmClient {
  async generate(ctx: CompanyContext, reportType: ReportType): Promise<CooOutput> {
    const live = ctx.projects.filter(
      (p) => p.project.status !== 'archived' && p.project.status !== 'paused',
    );
    const operationsHealth = live.some((p) => p.project.status === 'critical')
      ? 'critical'
      : live.some((p) => p.project.status === 'at_risk')
        ? 'at_risk'
        : 'healthy';

    const perProjectOperations = ctx.projects.map((p) => {
      const tagged = p.latestMetrics
        .map((m) => {
          const kind = classifyOps(m.name);
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
        operationalMetrics: tagged.slice(0, 5),
      };
    });

    const bottlenecks = ctx.projects.flatMap((p) =>
      p.openRisks
        .filter((r) => looksOps(r.description))
        .map((r) => ({
          projectSlug: p.project.slug,
          title: truncate(r.description, 60),
          severity: r.severity,
          description: r.description,
          recommendedAction:
            r.severity === 'critical'
              ? 'Convene incident bridge; assign single-threaded owner today.'
              : r.severity === 'high'
                ? 'Stand up a 1-week task force; daily standup until resolved.'
                : 'Track in weekly ops review.',
        })),
    );

    const vendorHealth: CooOutput['vendorHealth'] = [];
    for (const p of ctx.projects) {
      const vendors = PROJECT_VENDORS[p.project.slug] ?? [];
      for (const v of vendors) {
        const relevant = p.latestMetrics.find((m) => v.metricHint?.test(m.name));
        const status: VendorStatus =
          p.project.status === 'critical'
            ? 'critical'
            : p.project.status === 'at_risk'
              ? 'at_risk'
              : 'healthy';
        const notes = relevant
          ? `${relevant.name}: ${relevant.value}${relevant.unit ?? ''}.`
          : `No vendor-specific signal in current sync — inferred from project status.`;
        vendorHealth.push({
          projectSlug: p.project.slug,
          vendor: v.vendor,
          status,
          notes,
        });
      }
    }

    const operationalPriorities = [
      ...bottlenecks.slice(0, 2).map((b, i) => ({
        rank: i + 1,
        title: `Clear ${b.severity} bottleneck on ${b.projectSlug}: ${truncate(b.title, 60)}`,
        rationale: b.recommendedAction,
      })),
      ...vendorHealth
        .filter((v) => v.status !== 'healthy')
        .slice(0, 1)
        .map((v, i) => ({
          rank: bottlenecks.slice(0, 2).length + i + 1,
          title: `Pressure vendor: ${v.vendor} (${v.projectSlug})`,
          rationale: v.notes,
        })),
    ].slice(0, 3);

    const headlineBase =
      reportType === 'weekly_report'
        ? `Weekly ops read: ${live.length} project(s), ${bottlenecks.length} bottleneck(s), ${vendorHealth.filter((v) => v.status !== 'healthy').length} vendor signal(s).`
        : `Ops briefing: ${live.length} project(s), ${bottlenecks.length} bottleneck(s).`;

    return {
      headline:
        operationsHealth === 'critical'
          ? `${headlineBase} Ops: CRITICAL — see bottlenecks.`
          : operationsHealth === 'at_risk'
            ? `${headlineBase} Ops: at risk.`
            : `${headlineBase} Ops: healthy.`,
      operationsHealth,
      perProjectOperations,
      bottlenecks: bottlenecks.slice(0, 5),
      vendorHealth,
      operationalPriorities,
      generatedAt: new Date().toISOString(),
    };
  }
}

function summarize(p: CompanyContext['projects'][number]): string {
  const parts: string[] = [`Status: ${p.project.status}.`];
  const opsMetrics = p.latestMetrics.filter((m) => classifyOps(m.name));
  if (opsMetrics.length > 0) {
    const top = opsMetrics[0];
    if (top) parts.push(`Lead ops signal — ${top.name}: ${top.value}${top.unit ?? ''}.`);
  }
  if (p.openRisks.filter((r) => looksOps(r.description)).length > 0) {
    parts.push(
      `${p.openRisks.filter((r) => looksOps(r.description)).length} operational risk(s) open.`,
    );
  }
  return parts.join(' ');
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
