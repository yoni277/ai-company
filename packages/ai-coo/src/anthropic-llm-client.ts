import Anthropic from '@anthropic-ai/sdk';
import type { CompanyContext, CooOutput, ReportType } from '@ai-company/shared-types';
import type { CooLlmClient } from './llm-client';
import { ensureCooOutput } from './llm-client';
import { opsBriefingPrompt } from './prompts/ops-briefing';
import { opsReviewPrompt } from './prompts/ops-review';

const SYSTEM_PROMPT =
  'You are the AI COO for an AI-Native company. You are advisory only — you never reroute ' +
  'traffic, page vendors, page on-call, or modify ops systems. You produce structured ' +
  'operations output matching the provided tool schema. Be specific, terse, and grounded ' +
  'only in the provided context.';

const SUBMIT_TOOL_NAME = 'submit_coo_report';

const SUBMIT_TOOL_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  required: [
    'headline',
    'operationsHealth',
    'perProjectOperations',
    'bottlenecks',
    'vendorHealth',
    'operationalPriorities',
  ],
  properties: {
    headline: { type: 'string' },
    operationsHealth: {
      type: 'string',
      enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
    },
    perProjectOperations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'health', 'summary', 'operationalMetrics'],
        properties: {
          projectSlug: { type: 'string' },
          health: {
            type: 'string',
            enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
          },
          summary: { type: 'string' },
          operationalMetrics: {
            type: 'array',
            items: {
              type: 'object',
              required: ['kind', 'name', 'value'],
              properties: {
                kind: {
                  type: 'string',
                  enum: ['throughput', 'sla', 'queue', 'utilization', 'vendor'],
                },
                name: { type: 'string' },
                value: { type: 'number' },
                unit: { type: 'string' },
                slaTarget: { type: 'number' },
                commentary: { type: 'string' },
              },
            },
          },
        },
      },
    },
    bottlenecks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'title', 'severity', 'description', 'recommendedAction'],
        properties: {
          projectSlug: { type: 'string' },
          title: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          description: { type: 'string' },
          recommendedAction: { type: 'string' },
        },
      },
    },
    vendorHealth: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'vendor', 'status', 'notes'],
        properties: {
          projectSlug: { type: 'string' },
          vendor: { type: 'string' },
          status: { type: 'string', enum: ['healthy', 'at_risk', 'critical'] },
          notes: { type: 'string' },
        },
      },
    },
    operationalPriorities: {
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

export interface AnthropicCooConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class AnthropicCooLlmClient implements CooLlmClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: AnthropicCooConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-6';
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async generate(ctx: CompanyContext, reportType: ReportType): Promise<CooOutput> {
    const userPrompt =
      reportType === 'weekly_report' ? opsReviewPrompt(ctx) : opsBriefingPrompt(ctx);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: SUBMIT_TOOL_NAME,
          description:
            'Submit the structured COO report. You MUST call this exactly once with the full payload.',
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
        `AnthropicCooLlmClient: expected tool_use "${SUBMIT_TOOL_NAME}" in response, got: ` +
          response.content.map((b) => b.type).join(', '),
      );
    }
    return ensureCooOutput(toolUse.input);
  }
}
