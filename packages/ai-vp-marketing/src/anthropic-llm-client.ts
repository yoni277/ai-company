import Anthropic from '@anthropic-ai/sdk';
import type { CompanyContext, ReportType, VpMarketingOutput } from '@ai-company/shared-types';
import type { VpMarketingLlmClient } from './llm-client';
import { ensureVpMarketingOutput } from './llm-client';
import { marketingBriefingPrompt } from './prompts/marketing-briefing';
import { marketingReviewPrompt } from './prompts/marketing-review';

const SYSTEM_PROMPT =
  'You are the AI VP Marketing for an AI-Native company. You are advisory only — you never ' +
  'launch campaigns, send messages, spend ad budget, or modify external systems. You produce ' +
  'structured marketing output matching the provided tool schema. Be specific, terse, and ' +
  'grounded only in the provided context.';

const SUBMIT_TOOL_NAME = 'submit_vp_marketing_report';

const SUBMIT_TOOL_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  required: [
    'headline',
    'marketingHealth',
    'perProjectMarketing',
    'campaignIdeas',
    'growthRisks',
    'marketingPriorities',
  ],
  properties: {
    headline: { type: 'string' },
    marketingHealth: {
      type: 'string',
      enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
    },
    perProjectMarketing: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'health', 'summary', 'funnelMetrics'],
        properties: {
          projectSlug: { type: 'string' },
          health: {
            type: 'string',
            enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
          },
          summary: { type: 'string' },
          funnelMetrics: {
            type: 'array',
            items: {
              type: 'object',
              required: ['stage', 'name', 'value'],
              properties: {
                stage: {
                  type: 'string',
                  enum: [
                    'awareness',
                    'acquisition',
                    'activation',
                    'retention',
                    'referral',
                    'revenue',
                  ],
                },
                name: { type: 'string' },
                value: { type: 'number' },
                unit: { type: 'string' },
                trend: { type: 'string', enum: ['up', 'flat', 'down', 'unknown'] },
                commentary: { type: 'string' },
              },
            },
          },
        },
      },
    },
    campaignIdeas: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'title', 'channel', 'priority', 'description', 'expectedImpact'],
        properties: {
          projectSlug: { type: 'string' },
          title: { type: 'string' },
          channel: {
            type: 'string',
            enum: [
              'email',
              'push',
              'whatsapp',
              'social',
              'paid',
              'partnership',
              'organic',
              'product',
            ],
          },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          description: { type: 'string' },
          expectedImpact: { type: 'string' },
        },
      },
    },
    growthRisks: {
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
    marketingPriorities: {
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

export interface AnthropicVpMarketingConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class AnthropicVpMarketingLlmClient implements VpMarketingLlmClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: AnthropicVpMarketingConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-6';
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async generate(ctx: CompanyContext, reportType: ReportType): Promise<VpMarketingOutput> {
    const userPrompt =
      reportType === 'weekly_report' ? marketingReviewPrompt(ctx) : marketingBriefingPrompt(ctx);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: SUBMIT_TOOL_NAME,
          description:
            'Submit the structured VP Marketing report. You MUST call this exactly once with the full payload.',
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
        `AnthropicVpMarketingLlmClient: expected tool_use "${SUBMIT_TOOL_NAME}" in response, got: ` +
          response.content.map((b) => b.type).join(', '),
      );
    }
    return ensureVpMarketingOutput(toolUse.input);
  }
}
