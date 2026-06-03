import type {
  CompanyContext,
  Executive,
  ExecutiveReport,
  ReportType,
  VpSalesOutput,
} from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import { buildCompanyContext } from '@ai-company/ai-chief-of-staff';
import type { VpSalesLlmClient } from './llm-client';
import { FakeVpSalesLlmClient } from './fake-llm-client';
import { AnthropicVpSalesLlmClient } from './anthropic-llm-client';

export const VP_SALES_ID = 'vp-sales';

export interface VpSalesConfig {
  llm: VpSalesLlmClient;
}

export class VpSales implements Executive<VpSalesOutput> {
  readonly id = VP_SALES_ID;
  readonly displayName = 'AI VP Sales';
  readonly reportTypes: ReportType[] = ['daily_briefing', 'weekly_report', 'ad_hoc'];

  constructor(private readonly config: VpSalesConfig) {}

  async generateReport(ctx: CompanyContext, reportType: ReportType): Promise<VpSalesOutput> {
    return this.config.llm.generate(ctx, reportType);
  }
}

export interface VpSalesBriefingRunResult {
  context: CompanyContext;
  output: VpSalesOutput;
  report: ExecutiveReport<VpSalesOutput>;
}

/**
 * Sales briefing run. Persists sales risks (source: executive:vp-sales) so they appear
 * on the cross-executive Overview. Deals live in the report body — Phase 5 may give them
 * their own table once a CRM connector lands.
 */
export async function runVpSalesBriefing(
  repos: Repositories,
  vp: VpSales,
  reportType: ReportType,
): Promise<VpSalesBriefingRunResult> {
  const context = await buildCompanyContext(repos);
  const output = await vp.generateReport(context, reportType);

  const projectsBySlug = new Map(context.projects.map((p) => [p.project.slug, p.project]));

  const existingRiskKeys = new Set(
    context.projects.flatMap((p) =>
      p.openRisks.map((r) => `${p.project.id}|${r.description.toLowerCase()}`),
    ),
  );
  const newRisks = output.salesRisks
    .map((r) => {
      const project = projectsBySlug.get(r.projectSlug);
      if (!project) return null;
      const key = `${project.id}|${r.description.toLowerCase()}`;
      if (existingRiskKeys.has(key)) return null;
      return {
        projectId: project.id,
        severity: r.severity,
        description: r.description,
        source: `executive:${VP_SALES_ID}`,
        status: 'open' as const,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (newRisks.length > 0) await repos.risks.createMany(newRisks);

  const report = (await repos.reports.create({
    executiveId: VP_SALES_ID,
    reportType,
    summary: output.headline,
    body: output,
  })) as ExecutiveReport<VpSalesOutput>;

  return { context, output, report };
}

export function buildDefaultVpSales(): VpSales {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const config: { apiKey: string; model?: string } = { apiKey: anthropicKey };
    if (process.env.ANTHROPIC_MODEL) config.model = process.env.ANTHROPIC_MODEL;
    return new VpSales({ llm: new AnthropicVpSalesLlmClient(config) });
  }
  return new VpSales({ llm: new FakeVpSalesLlmClient() });
}
