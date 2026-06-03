import Anthropic from '@anthropic-ai/sdk';
import type { CfoOutput, CompanyContext, ReportType } from '@ai-company/shared-types';
import type { CfoLlmClient } from './llm-client';
import { ensureCfoOutput } from './llm-client';
import { financeBriefingPrompt } from './prompts/finance-briefing';
import { financeReviewPrompt } from './prompts/finance-review';

const SYSTEM_PROMPT =
  'You are the AI CFO for an AI-Native company. You are advisory only — you never move ' +
  'money, commit spend, sign contracts, or modify external systems. You produce structured ' +
  'finance output matching the provided tool schema. Be specific, terse, and grounded only ' +
  'in the provided context. Never fabricate revenue figures or runway estimates.';

const SUBMIT_TOOL_NAME = 'submit_cfo_report';

const SUBMIT_TOOL_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  required: [
    'headline',
    'financialHealth',
    'perProjectFinancials',
    'financialRisks',
    'capitalAllocations',
    'financialPriorities',
  ],
  properties: {
    headline: { type: 'string' },
    financialHealth: {
      type: 'string',
      enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
    },
    cashSnapshot: {
      type: 'object',
      required: ['commentary'],
      properties: {
        estimatedRunwayMonths: { type: 'number' },
        commentary: { type: 'string' },
      },
    },
    perProjectFinancials: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'health', 'summary', 'revenueSignals'],
        properties: {
          projectSlug: { type: 'string' },
          health: {
            type: 'string',
            enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
          },
          summary: { type: 'string' },
          revenueSignals: {
            type: 'array',
            items: {
              type: 'object',
              required: ['kind', 'name', 'value'],
              properties: {
                kind: {
                  type: 'string',
                  enum: ['revenue', 'mrr', 'arr', 'cost', 'unit_economic', 'pipeline'],
                },
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
    financialRisks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'severity', 'category', 'description', 'recommendedAction'],
        properties: {
          projectSlug: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          category: {
            type: 'string',
            enum: ['revenue', 'cost', 'cash', 'unit_economics', 'capital'],
          },
          description: { type: 'string' },
          recommendedAction: { type: 'string' },
        },
      },
    },
    capitalAllocations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'action', 'rationale', 'estimatedImpact'],
        properties: {
          projectSlug: { type: 'string' },
          action: {
            type: 'string',
            enum: ['invest', 'maintain', 'reduce', 'monetize', 'monitor'],
          },
          rationale: { type: 'string' },
          estimatedImpact: { type: 'string' },
        },
      },
    },
    financialPriorities: {
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

export interface AnthropicCfoConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class AnthropicCfoLlmClient implements CfoLlmClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: AnthropicCfoConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-6';
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async generate(ctx: CompanyContext, reportType: ReportType): Promise<CfoOutput> {
    const userPrompt =
      reportType === 'weekly_report' ? financeReviewPrompt(ctx) : financeBriefingPrompt(ctx);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: SUBMIT_TOOL_NAME,
          description:
            'Submit the structured CFO report. You MUST call this exactly once with the full payload.',
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
        `AnthropicCfoLlmClient: expected tool_use "${SUBMIT_TOOL_NAME}" in response, got: ` +
          response.content.map((b) => b.type).join(', '),
      );
    }
    return ensureCfoOutput(toolUse.input);
  }
}
