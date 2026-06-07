import type {
  CEODirective,
  CfoOutput,
  CompanyContext,
  Executive,
  ExecutiveReport,
  ReportType,
} from '@ai-company/shared-types';
import { fingerprintRisk } from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import { buildCompanyContext } from '@ai-company/ai-chief-of-staff';
import type { CfoLlmClient } from './llm-client';
import { FakeCfoLlmClient } from './fake-llm-client';
import { AnthropicCfoLlmClient } from './anthropic-llm-client';

export const CFO_ID = 'cfo';

export interface CfoConfig {
  llm: CfoLlmClient;
}

export class Cfo implements Executive<CfoOutput> {
  readonly id = CFO_ID;
  readonly displayName = 'AI CFO';
  readonly reportTypes: ReportType[] = ['daily_briefing', 'weekly_report', 'ad_hoc'];

  constructor(private readonly config: CfoConfig) {}

  async generateReport(ctx: CompanyContext, reportType: ReportType): Promise<CfoOutput> {
    return this.config.llm.generate(ctx, reportType);
  }
}

export interface CfoBriefingRunResult {
  context: CompanyContext;
  output: CfoOutput;
  report: ExecutiveReport<CfoOutput>;
}

/**
 * Finance briefing run. Persists financial risks (source: executive:cfo) so they show up on
 * the cross-executive Overview. Capital allocations live in the report body only — they're
 * recommendations, not commitments. The CFO never moves money or commits spend.
 */
export interface RunCfoBriefingOptions {
  focusDirective?: CEODirective;
  activeDirectives?: CEODirective[];
}

export async function runCfoBriefing(
  repos: Repositories,
  cfo: Cfo,
  reportType: ReportType,
  options: RunCfoBriefingOptions = {},
): Promise<CfoBriefingRunResult> {
  const context = await buildCompanyContext(repos, {
    ...(options.activeDirectives ? { activeDirectives: options.activeDirectives } : {}),
    ...(options.focusDirective ? { focusDirective: options.focusDirective } : {}),
  });
  const output = await cfo.generateReport(context, reportType);

  const projectsBySlug = new Map(context.projects.map((p) => [p.project.slug, p.project]));

  const existingRiskKeys = new Set(
    context.projects.flatMap((p) =>
      p.openRisks.map((r) => `${p.project.id}|${r.description.toLowerCase()}`),
    ),
  );
  // P006A — risk writes carry provenance + fingerprint.
  const recordedBy = `executive:${CFO_ID}`;
  const newRisks = output.financialRisks
    .map((r) => {
      const project = projectsBySlug.get(r.projectSlug);
      if (!project) return null;
      const key = `${project.id}|${r.description.toLowerCase()}`;
      if (existingRiskKeys.has(key)) return null;
      return {
        projectId: project.id,
        severity: r.severity,
        description: r.description,
        source: recordedBy,
        status: 'open' as const,
        recordedBy,
        fingerprint: fingerprintRisk({
          projectId: project.id,
          recordedBy,
          severity: r.severity,
          description: r.description,
        }),
        generation: 1,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (newRisks.length > 0) await repos.risks.createMany(newRisks);

  const report = (await repos.reports.create({
    executiveId: CFO_ID,
    reportType,
    summary: output.headline,
    body: output,
    sourceDirectiveId: options.focusDirective?.id ?? null,
  })) as ExecutiveReport<CfoOutput>;

  return { context, output, report };
}

/**
 * Build the default CFO for the current env. Same provider precedence as the other executives.
 */
export function buildDefaultCfo(): Cfo {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const config: { apiKey: string; model?: string } = { apiKey: anthropicKey };
    if (process.env.ANTHROPIC_MODEL) config.model = process.env.ANTHROPIC_MODEL;
    return new Cfo({ llm: new AnthropicCfoLlmClient(config) });
  }
  return new Cfo({ llm: new FakeCfoLlmClient() });
}
