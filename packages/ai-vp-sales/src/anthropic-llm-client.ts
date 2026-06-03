import Anthropic from '@anthropic-ai/sdk';
import type { CompanyContext, ReportType, VpSalesOutput } from '@ai-company/shared-types';
import type { VpSalesLlmClient } from './llm-client';
import { ensureVpSalesOutput } from './llm-client';
import { salesBriefingPrompt } from './prompts/sales-briefing';
import { salesReviewPrompt } from './prompts/sales-review';

const SYSTEM_PROMPT =
  'You are the AI VP Sales for an AI-Native company. You are advisory only — you never ' +
  'send outreach, sign contracts, commit pricing, or modify CRM records. You produce ' +
  'structured sales output matching the provided tool schema. Be specific, terse, and ' +
  'grounded only in the provided context. Never fabricate deals, customer names, or values.';

const SUBMIT_TOOL_NAME = 'submit_vp_sales_report';

const SUBMIT_TOOL_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  required: [
    'headline',
    'salesHealth',
    'perProjectSales',
    'deals',
    'salesRisks',
    'salesPriorities',
  ],
  properties: {
    headline: { type: 'string' },
    salesHealth: {
      type: 'string',
      enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
    },
    forecastSummary: {
      type: 'object',
      required: ['commentary'],
      properties: {
        quotaProgress: { type: 'number', minimum: 0, maximum: 1 },
        commentary: { type: 'string' },
      },
    },
    perProjectSales: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'health', 'summary', 'pipelineMetrics'],
        properties: {
          projectSlug: { type: 'string' },
          health: {
            type: 'string',
            enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
          },
          summary: { type: 'string' },
          pipelineMetrics: {
            type: 'array',
            items: {
              type: 'object',
              required: ['stage', 'name', 'value'],
              properties: {
                stage: {
                  type: 'string',
                  enum: [
                    'prospect',
                    'qualified',
                    'demo',
                    'pilot',
                    'negotiation',
                    'closed_won',
                    'closed_lost',
                  ],
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
    deals: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'title', 'status', 'nextAction'],
        properties: {
          projectSlug: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string', enum: ['open', 'at_risk', 'won', 'lost'] },
          estimatedValue: { type: 'number' },
          estimatedValueUnit: { type: 'string' },
          nextAction: { type: 'string' },
        },
      },
    },
    salesRisks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'severity', 'description', 'recommendedAction'],
        properties: {
          projectSlug: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          description: { type: 'string' },
          recommendedAction: { type: 'string' },
        },
      },
    },
    salesPriorities: {
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

export interface AnthropicVpSalesConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class AnthropicVpSalesLlmClient implements VpSalesLlmClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: AnthropicVpSalesConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-6';
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async generate(ctx: CompanyContext, reportType: ReportType): Promise<VpSalesOutput> {
    const userPrompt =
      reportType === 'weekly_report' ? salesReviewPrompt(ctx) : salesBriefingPrompt(ctx);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: SUBMIT_TOOL_NAME,
          description:
            'Submit the structured VP Sales report. You MUST call this exactly once with the full payload.',
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
        `AnthropicVpSalesLlmClient: expected tool_use "${SUBMIT_TOOL_NAME}" in response, got: ` +
          response.content.map((b) => b.type).join(', '),
      );
    }
    return ensureVpSalesOutput(toolUse.input);
  }
}
