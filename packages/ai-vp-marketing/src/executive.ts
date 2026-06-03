import type {
  CompanyContext,
  Executive,
  ExecutiveReport,
  ReportType,
  VpMarketingOutput,
} from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import { buildCompanyContext } from '@ai-company/ai-chief-of-staff';
import type { VpMarketingLlmClient } from './llm-client';
import { FakeVpMarketingLlmClient } from './fake-llm-client';
import { AnthropicVpMarketingLlmClient } from './anthropic-llm-client';

export const VP_MARKETING_ID = 'vp-marketing';

export interface VpMarketingConfig {
  llm: VpMarketingLlmClient;
}

export class VpMarketing implements Executive<VpMarketingOutput> {
  readonly id = VP_MARKETING_ID;
  readonly displayName = 'AI VP Marketing';
  readonly reportTypes: ReportType[] = ['daily_briefing', 'weekly_report', 'ad_hoc'];

  constructor(private readonly config: VpMarketingConfig) {}

  async generateReport(ctx: CompanyContext, reportType: ReportType): Promise<VpMarketingOutput> {
    return this.config.llm.generate(ctx, reportType);
  }
}

export interface VpMarketingBriefingRunResult {
  context: CompanyContext;
  output: VpMarketingOutput;
  report: ExecutiveReport<VpMarketingOutput>;
}

/**
 * Marketing briefing run. Persists growth risks as platform risks (source: executive:vp-marketing)
 * so they show up on the cross-executive Overview alongside CoS and CTO risks. Campaign ideas
 * stay in the report body — Phase 5 may give them their own table once we add a campaign tracker.
 */
export async function runVpMarketingBriefing(
  repos: Repositories,
  vp: VpMarketing,
  reportType: ReportType,
): Promise<VpMarketingBriefingRunResult> {
  const context = await buildCompanyContext(repos);
  const output = await vp.generateReport(context, reportType);

  const projectsBySlug = new Map(context.projects.map((p) => [p.project.slug, p.project]));

  const existingRiskKeys = new Set(
    context.projects.flatMap((p) =>
      p.openRisks.map((r) => `${p.project.id}|${r.description.toLowerCase()}`),
    ),
  );
  const newRisks = output.growthRisks
    .map((r) => {
      const project = projectsBySlug.get(r.projectSlug);
      if (!project) return null;
      const key = `${project.id}|${r.description.toLowerCase()}`;
      if (existingRiskKeys.has(key)) return null;
      return {
        projectId: project.id,
        severity: r.severity,
        description: r.description,
        source: `executive:${VP_MARKETING_ID}`,
        status: 'open' as const,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (newRisks.length > 0) await repos.risks.createMany(newRisks);

  const report = (await repos.reports.create({
    executiveId: VP_MARKETING_ID,
    reportType,
    summary: output.headline,
    body: output,
  })) as ExecutiveReport<VpMarketingOutput>;

  return { context, output, report };
}

/**
 * Build the default VP Marketing for the current env. Same provider precedence as Chief of Staff / CTO.
 */
export function buildDefaultVpMarketing(): VpMarketing {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const config: { apiKey: string; model?: string } = { apiKey: anthropicKey };
    if (process.env.ANTHROPIC_MODEL) config.model = process.env.ANTHROPIC_MODEL;
    return new VpMarketing({ llm: new AnthropicVpMarketingLlmClient(config) });
  }
  return new VpMarketing({ llm: new FakeVpMarketingLlmClient() });
}
