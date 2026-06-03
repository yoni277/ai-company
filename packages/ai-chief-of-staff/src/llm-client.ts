import OpenAI from 'openai';
import type { ChiefOfStaffOutput, CompanyContext, ReportType } from '@ai-company/shared-types';
import { dailyBriefingPrompt } from './prompts/daily-briefing';
import { weeklyReportPrompt } from './prompts/weekly-report';

export interface LlmClient {
  generate(ctx: CompanyContext, reportType: ReportType): Promise<ChiefOfStaffOutput>;
}

export interface OpenAiConfig {
  apiKey: string;
  model?: string;
}

/**
 * OpenAI-backed implementation. Uses JSON response format so the result is always parseable.
 */
export class OpenAiLlmClient implements LlmClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: OpenAiConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'gpt-4o-mini';
  }

  async generate(ctx: CompanyContext, reportType: ReportType): Promise<ChiefOfStaffOutput> {
    const prompt = reportType === 'weekly_report' ? weeklyReportPrompt(ctx) : dailyBriefingPrompt(ctx);

    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are the AI Chief of Staff for an AI-Native company. You are advisory only — you never take actions, approve spend, or modify external systems. You produce structured JSON matching the provided schema. Be specific, terse, and grounded only in the provided context.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error('OpenAiLlmClient: empty completion');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `OpenAiLlmClient: invalid JSON from model — ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return ensureChiefOfStaffOutput(parsed);
  }
}

/**
 * Validate the LLM payload. Required scalars must be present; array fields default
 * to `[]` when the model omits them. Tolerant of benign Claude tool-use schema drift.
 */
export function ensureChiefOfStaffOutput(value: unknown): ChiefOfStaffOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('ChiefOfStaffOutput: not an object');
  }
  const v = value as Record<string, unknown>;

  if (typeof v.headline !== 'string') {
    throw new Error('ChiefOfStaffOutput: missing or non-string field "headline"');
  }
  if (typeof v.companyHealth !== 'string') {
    throw new Error('ChiefOfStaffOutput: missing or non-string field "companyHealth"');
  }

  const arrayField = <T>(name: keyof ChiefOfStaffOutput): T[] => {
    const raw = v[name as string];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      throw new Error(`ChiefOfStaffOutput: "${String(name)}" must be an array when present`);
    }
    return raw as T[];
  };

  return {
    headline: v.headline,
    companyHealth: v.companyHealth as ChiefOfStaffOutput['companyHealth'],
    perProject: arrayField<ChiefOfStaffOutput['perProject'][number]>('perProject'),
    topRisks: arrayField<ChiefOfStaffOutput['topRisks'][number]>('topRisks'),
    topOpportunities: arrayField<ChiefOfStaffOutput['topOpportunities'][number]>(
      'topOpportunities',
    ),
    ceoPriorities: arrayField<ChiefOfStaffOutput['ceoPriorities'][number]>('ceoPriorities'),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
