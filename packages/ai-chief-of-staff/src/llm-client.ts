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

export function ensureChiefOfStaffOutput(value: unknown): ChiefOfStaffOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('ChiefOfStaffOutput: not an object');
  }
  const v = value as Record<string, unknown>;
  const required = [
    'headline',
    'companyHealth',
    'perProject',
    'topRisks',
    'topOpportunities',
    'ceoPriorities',
  ];
  for (const k of required) {
    if (!(k in v)) throw new Error(`ChiefOfStaffOutput: missing field "${k}"`);
  }
  if (!Array.isArray(v.perProject)) throw new Error('ChiefOfStaffOutput: perProject must be array');
  if (!Array.isArray(v.topRisks)) throw new Error('ChiefOfStaffOutput: topRisks must be array');
  if (!Array.isArray(v.topOpportunities))
    throw new Error('ChiefOfStaffOutput: topOpportunities must be array');
  if (!Array.isArray(v.ceoPriorities))
    throw new Error('ChiefOfStaffOutput: ceoPriorities must be array');

  return {
    ...(v as unknown as ChiefOfStaffOutput),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
