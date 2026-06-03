import Anthropic from '@anthropic-ai/sdk';
import type { CompanyContext, CtoOutput, ReportType } from '@ai-company/shared-types';
import type { CtoLlmClient } from './llm-client';
import { ensureCtoOutput } from './llm-client';
import { engineeringBriefingPrompt } from './prompts/engineering-briefing';
import { engineeringReviewPrompt } from './prompts/engineering-review';

const SYSTEM_PROMPT =
  'You are the AI CTO for an AI-Native company. You are advisory only — you never take ' +
  'actions, approve spend, deploy code, or modify infrastructure. You produce structured ' +
  'engineering output matching the provided tool schema. Be specific, terse, and grounded ' +
  'only in the provided context.';

const SUBMIT_TOOL_NAME = 'submit_cto_report';

const SUBMIT_TOOL_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  required: [
    'headline',
    'platformHealth',
    'perProjectEngineering',
    'topTechnicalRisks',
    'techDebtItems',
    'engineeringPriorities',
  ],
  properties: {
    headline: { type: 'string' },
    platformHealth: {
      type: 'string',
      enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
    },
    perProjectEngineering: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'health', 'summary', 'technicalSignals'],
        properties: {
          projectSlug: { type: 'string' },
          health: {
            type: 'string',
            enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
          },
          summary: { type: 'string' },
          technicalSignals: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'value'],
              properties: {
                name: { type: 'string' },
                value: { type: 'number' },
                unit: { type: 'string' },
                commentary: { type: 'string' },
              },
            },
          },
        },
      },
    },
    topTechnicalRisks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'severity', 'category', 'description', 'recommendedAction'],
        properties: {
          projectSlug: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          category: {
            type: 'string',
            enum: ['infrastructure', 'security', 'reliability', 'performance', 'tech_debt'],
          },
          description: { type: 'string' },
          recommendedAction: { type: 'string' },
        },
      },
    },
    techDebtItems: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'title', 'impact', 'description'],
        properties: {
          projectSlug: { type: 'string' },
          title: { type: 'string' },
          impact: { type: 'string', enum: ['low', 'medium', 'high'] },
          description: { type: 'string' },
        },
      },
    },
    engineeringPriorities: {
      type: 'array',
      items: {
        type: 'object',
        required: ['rank', 'title', 'rationale'],
        properties: {
          rank: { type: 'integer', minimum: 1 },
          title: { type: 'string' },
          rationale: { type: 'string' },
        },
      },
    },
  },
};

export interface AnthropicCtoConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class AnthropicCtoLlmClient implements CtoLlmClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: AnthropicCtoConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-6';
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async generate(ctx: CompanyContext, reportType: ReportType): Promise<CtoOutput> {
    const userPrompt =
      reportType === 'weekly_report' ? engineeringReviewPrompt(ctx) : engineeringBriefingPrompt(ctx);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: SUBMIT_TOOL_NAME,
          description:
            'Submit the structured CTO engineering report. You MUST call this exactly once with the full payload.',
          input_schema: SUBMIT_TOOL_INPUT_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: SUBMIT_TOOL_NAME },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === 'tool_use' && block.name === SUBMIT_TOOL_NAME,
    );
    if (!toolUse) {
      throw new Error(
        `AnthropicCtoLlmClient: expected tool_use "${SUBMIT_TOOL_NAME}" in response, got: ` +
          response.content.map((b) => b.type).join(', '),
      );
    }
    return ensureCtoOutput(toolUse.input);
  }
}
