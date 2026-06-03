import type {
  BoardDigestOutput,
  CompanyContext,
  Executive,
  ExecutiveReport,
  ReportType,
} from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';
import { buildCompanyContext } from '@ai-company/ai-chief-of-staff';
import { buildExecutiveTeamInput, type ExecutiveDef } from './input';
import type { ExecutiveTeamLlmClient } from './llm-client';
import { FakeExecutiveTeamLlmClient } from './fake-llm-client';
import { AnthropicExecutiveTeamLlmClient } from './anthropic-llm-client';

export const EXECUTIVE_TEAM_ID = 'executive-team';

export interface ExecutiveTeamConfig {
  llm: ExecutiveTeamLlmClient;
  /** Executives whose latest daily briefings should feed the synthesis. */
  executives: ExecutiveDef[];
  /** Repository access — needed at construction since synthesis reads other executives' reports. */
  repos: Repositories;
}

/**
 * The AI Executive Team is a meta-executive. It satisfies the same `Executive<TOutput>`
 * contract as the others but its real input is the set of latest executive reports,
 * not the CompanyContext alone. It produces a board-level digest.
 */
export class ExecutiveTeam implements Executive<BoardDigestOutput> {
  readonly id = EXECUTIVE_TEAM_ID;
  readonly displayName = 'AI Executive Team';
  readonly reportTypes: ReportType[] = ['daily_briefing', 'weekly_report', 'ad_hoc'];

  constructor(private readonly config: ExecutiveTeamConfig) {}

  async generateReport(ctx: CompanyContext): Promise<BoardDigestOutput> {
    const input = await buildExecutiveTeamInput(this.config.repos, ctx, this.config.executives);
    return this.config.llm.generate(input);
  }
}

export interface BoardDigestRunResult {
  context: CompanyContext;
  output: BoardDigestOutput;
  report: ExecutiveReport<BoardDigestOutput>;
}

/**
 * Full synthesis run: build context, pull each executive's latest report, ask the LLM to
 * synthesize, persist as an executive_reports row under executive_id = 'executive-team'.
 *
 * No new risks are written — the executive team reflects existing executive surface area
 * rather than introducing new claims of its own.
 */
export async function runBoardDigest(
  repos: Repositories,
  team: ExecutiveTeam,
  reportType: ReportType,
): Promise<BoardDigestRunResult> {
  const context = await buildCompanyContext(repos);
  const output = await team.generateReport(context);

  const report = (await repos.reports.create({
    executiveId: EXECUTIVE_TEAM_ID,
    reportType,
    summary: output.headline,
    body: output,
  })) as ExecutiveReport<BoardDigestOutput>;

  return { context, output, report };
}

export function buildDefaultExecutiveTeam(
  repos: Repositories,
  executives: ExecutiveDef[],
): ExecutiveTeam {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const config: { apiKey: string; model?: string } = { apiKey: anthropicKey };
    if (process.env.ANTHROPIC_MODEL) config.model = process.env.ANTHROPIC_MODEL;
    return new ExecutiveTeam({
      llm: new AnthropicExecutiveTeamLlmClient(config),
      executives,
      repos,
    });
  }
  return new ExecutiveTeam({
    llm: new FakeExecutiveTeamLlmClient(),
    executives,
    repos,
  });
}
