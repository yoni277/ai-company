import type {
  CompanyContext,
  CooOutput,
  Executive,
  ExecutiveReport,
  ReportType,
} from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import { buildCompanyContext } from '@ai-company/ai-chief-of-staff';
import type { CooLlmClient } from './llm-client';
import { FakeCooLlmClient } from './fake-llm-client';
import { AnthropicCooLlmClient } from './anthropic-llm-client';

export const COO_ID = 'coo';

export interface CooConfig {
  llm: CooLlmClient;
}

export class Coo implements Executive<CooOutput> {
  readonly id = COO_ID;
  readonly displayName = 'AI COO';
  readonly reportTypes: ReportType[] = ['daily_briefing', 'weekly_report', 'ad_hoc'];

  constructor(private readonly config: CooConfig) {}

  async generateReport(ctx: CompanyContext, reportType: ReportType): Promise<CooOutput> {
    return this.config.llm.generate(ctx, reportType);
  }
}

export interface CooBriefingRunResult {
  context: CompanyContext;
  output: CooOutput;
  report: ExecutiveReport<CooOutput>;
}

/**
 * Ops briefing run. Persists bottlenecks as platform risks (source: executive:coo).
 * Vendor health snapshots and operational priorities live in the report body only.
 */
export async function runCooBriefing(
  repos: Repositories,
  coo: Coo,
  reportType: ReportType,
): Promise<CooBriefingRunResult> {
  const context = await buildCompanyContext(repos);
  const output = await coo.generateReport(context, reportType);

  const projectsBySlug = new Map(context.projects.map((p) => [p.project.slug, p.project]));

  const existingRiskKeys = new Set(
    context.projects.flatMap((p) =>
      p.openRisks.map((r) => `${p.project.id}|${r.description.toLowerCase()}`),
    ),
  );
  const newRisks = output.bottlenecks
    .map((b) => {
      const project = projectsBySlug.get(b.projectSlug);
      if (!project) return null;
      const key = `${project.id}|${b.description.toLowerCase()}`;
      if (existingRiskKeys.has(key)) return null;
      return {
        projectId: project.id,
        severity: b.severity,
        description: b.description,
        source: `executive:${COO_ID}`,
        status: 'open' as const,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (newRisks.length > 0) await repos.risks.createMany(newRisks);

  const report = (await repos.reports.create({
    executiveId: COO_ID,
    reportType,
    summary: output.headline,
    body: output,
  })) as ExecutiveReport<CooOutput>;

  return { context, output, report };
}

export function buildDefaultCoo(): Coo {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const config: { apiKey: string; model?: string } = { apiKey: anthropicKey };
    if (process.env.ANTHROPIC_MODEL) config.model = process.env.ANTHROPIC_MODEL;
    return new Coo({ llm: new AnthropicCooLlmClient(config) });
  }
  return new Coo({ llm: new FakeCooLlmClient() });
}
