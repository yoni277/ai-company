import type {
  CEODirective,
  ChiefOfStaffOutput,
  CompanyContext,
  Executive,
  ExecutiveReport,
  ReportType,
} from '@ai-company/shared-types';
import { fingerprintOpportunity, fingerprintRisk } from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import { buildCompanyContext } from './context';
import { FakeLlmClient } from './fake-llm-client';
import { OpenAiLlmClient, type LlmClient } from './llm-client';
import { AnthropicLlmClient } from './anthropic-llm-client';

export const CHIEF_OF_STAFF_ID = 'chief-of-staff';

export interface ChiefOfStaffConfig {
  llm: LlmClient;
}

export class ChiefOfStaff implements Executive<ChiefOfStaffOutput> {
  readonly id = CHIEF_OF_STAFF_ID;
  readonly displayName = 'AI Chief of Staff';
  readonly reportTypes: ReportType[] = ['daily_briefing', 'weekly_report', 'ad_hoc'];

  constructor(private readonly config: ChiefOfStaffConfig) {}

  async generateReport(ctx: CompanyContext, reportType: ReportType): Promise<ChiefOfStaffOutput> {
    return this.config.llm.generate(ctx, reportType);
  }
}

export interface BriefingRunResult {
  context: CompanyContext;
  output: ChiefOfStaffOutput;
  report: ExecutiveReport<ChiefOfStaffOutput>;
}

/**
 * Full briefing run: collect context → call LLM → persist report + linked risks/opportunities.
 *
 * The Chief of Staff records new risks/opportunities it surfaces with `source: 'executive:chief-of-staff'`
 * so the dashboard can show provenance.
 */
export interface RunBriefingOptions {
  focusDirective?: CEODirective;
  activeDirectives?: CEODirective[];
}

export async function runBriefing(
  repos: Repositories,
  chief: ChiefOfStaff,
  reportType: ReportType,
  options: RunBriefingOptions = {},
): Promise<BriefingRunResult> {
  const context = await buildCompanyContext(repos, {
    ...(options.activeDirectives ? { activeDirectives: options.activeDirectives } : {}),
    ...(options.focusDirective ? { focusDirective: options.focusDirective } : {}),
  });
  const output = await chief.generateReport(context, reportType);

  const projectsBySlug = new Map(context.projects.map((p) => [p.project.slug, p.project]));

  // Persist newly-named risks (avoid duplicating identical descriptions for same project).
  const existingRiskKeys = new Set(
    context.projects.flatMap((p) =>
      p.openRisks.map((r) => `${p.project.id}|${r.description.toLowerCase()}`),
    ),
  );
  // P006A — every risk + opportunity write carries provenance + fingerprint.
  const recordedBy = `executive:${CHIEF_OF_STAFF_ID}`;

  const newRisks = output.topRisks
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

  const existingOppKeys = new Set(
    context.projects.flatMap((p) =>
      p.openOpportunities.map((o) => `${p.project.id}|${o.description.toLowerCase()}`),
    ),
  );
  const newOpps = output.topOpportunities
    .map((o) => {
      const project = projectsBySlug.get(o.projectSlug);
      if (!project) return null;
      const key = `${project.id}|${o.description.toLowerCase()}`;
      if (existingOppKeys.has(key)) return null;
      return {
        projectId: project.id,
        priority: o.priority,
        description: o.description,
        source: recordedBy,
        recordedBy,
        fingerprint: fingerprintOpportunity({
          projectId: project.id,
          recordedBy,
          priority: o.priority,
          description: o.description,
        }),
        generation: 1,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (newOpps.length > 0) await repos.opportunities.createMany(newOpps);

  const report = (await repos.reports.create({
    executiveId: CHIEF_OF_STAFF_ID,
    reportType,
    summary: output.headline,
    body: output,
    sourceDirectiveId: options.focusDirective?.id ?? null,
  })) as ExecutiveReport<ChiefOfStaffOutput>;

  return { context, output, report };
}

/**
 * Build the default Chief of Staff for the current env.
 *
 * Provider precedence:
 *   1. ANTHROPIC_API_KEY     → Claude via tool-use (preferred, default model: claude-sonnet-4-6)
 *   2. OPENAI_API_KEY        → OpenAI via JSON response_format
 *   3. neither               → deterministic FakeLlmClient (demos + tests)
 *
 * Override the model per provider via ANTHROPIC_MODEL / OPENAI_MODEL.
 */
export function buildDefaultChiefOfStaff(): ChiefOfStaff {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const config: { apiKey: string; model?: string } = { apiKey: anthropicKey };
    if (process.env.ANTHROPIC_MODEL) config.model = process.env.ANTHROPIC_MODEL;
    return new ChiefOfStaff({ llm: new AnthropicLlmClient(config) });
  }
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    const config: { apiKey: string; model?: string } = { apiKey: openAiKey };
    if (process.env.OPENAI_MODEL) config.model = process.env.OPENAI_MODEL;
    return new ChiefOfStaff({ llm: new OpenAiLlmClient(config) });
  }
  return new ChiefOfStaff({ llm: new FakeLlmClient() });
}
