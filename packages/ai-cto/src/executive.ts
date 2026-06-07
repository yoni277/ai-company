import type {
  CEODirective,
  CompanyContext,
  CtoOutput,
  Executive,
  ExecutiveReport,
  ReportType,
} from '@ai-company/shared-types';
import { fingerprintRisk } from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import { buildCompanyContext } from '@ai-company/ai-chief-of-staff';
import type { CtoLlmClient } from './llm-client';
import { FakeCtoLlmClient } from './fake-llm-client';
import { AnthropicCtoLlmClient } from './anthropic-llm-client';

export const CTO_ID = 'cto';

export interface CtoConfig {
  llm: CtoLlmClient;
}

export class Cto implements Executive<CtoOutput> {
  readonly id = CTO_ID;
  readonly displayName = 'AI CTO';
  readonly reportTypes: ReportType[] = ['daily_briefing', 'weekly_report', 'ad_hoc'];

  constructor(private readonly config: CtoConfig) {}

  async generateReport(ctx: CompanyContext, reportType: ReportType): Promise<CtoOutput> {
    return this.config.llm.generate(ctx, reportType);
  }
}

export interface CtoBriefingRunResult {
  context: CompanyContext;
  output: CtoOutput;
  report: ExecutiveReport<CtoOutput>;
}

/**
 * CTO briefing run: same shape as Chief of Staff's runBriefing but writes its
 * own technical risks into the repos (source: `executive:cto`) so provenance is clear.
 *
 * Tech debt items are NOT mirrored into the `opportunities` table — they're a
 * different concept and live in the report body only. Phase 4 may give them their
 * own table once we have a backlog grooming UI.
 */
export interface RunCtoBriefingOptions {
  focusDirective?: CEODirective;
  activeDirectives?: CEODirective[];
}

export async function runCtoBriefing(
  repos: Repositories,
  cto: Cto,
  reportType: ReportType,
  options: RunCtoBriefingOptions = {},
): Promise<CtoBriefingRunResult> {
  const context = await buildCompanyContext(repos, {
    ...(options.activeDirectives ? { activeDirectives: options.activeDirectives } : {}),
    ...(options.focusDirective ? { focusDirective: options.focusDirective } : {}),
  });
  const output = await cto.generateReport(context, reportType);

  const projectsBySlug = new Map(context.projects.map((p) => [p.project.slug, p.project]));

  const existingRiskKeys = new Set(
    context.projects.flatMap((p) =>
      p.openRisks.map((r) => `${p.project.id}|${r.description.toLowerCase()}`),
    ),
  );
  // P006A — risk writes carry provenance + fingerprint.
  const recordedBy = `executive:${CTO_ID}`;
  const newRisks = output.topTechnicalRisks
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
    executiveId: CTO_ID,
    reportType,
    summary: output.headline,
    body: output,
    sourceDirectiveId: options.focusDirective?.id ?? null,
  })) as ExecutiveReport<CtoOutput>;

  return { context, output, report };
}

/**
 * Build the default CTO for the current env. Same provider precedence as Chief of Staff.
 */
export function buildDefaultCto(): Cto {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const config: { apiKey: string; model?: string } = { apiKey: anthropicKey };
    if (process.env.ANTHROPIC_MODEL) config.model = process.env.ANTHROPIC_MODEL;
    return new Cto({ llm: new AnthropicCtoLlmClient(config) });
  }
  return new Cto({ llm: new FakeCtoLlmClient() });
}
