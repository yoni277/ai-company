import Anthropic from '@anthropic-ai/sdk';
import type { ChiefOfStaffOutput, CompanyContext, ReportType } from '@ai-company/shared-types';
import { dailyBriefingPrompt } from './prompts/daily-briefing';
import { weeklyReportPrompt } from './prompts/weekly-report';
import type { LlmClient } from './llm-client';
import { ensureChiefOfStaffOutput } from './llm-client';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  /** Max output tokens. Briefings rarely exceed ~2k. */
  maxTokens?: number;
}

const SYSTEM_PROMPT =
  'You are the AI Chief of Staff for an AI-Native company. You are advisory only — ' +
  'you never take actions, approve spend, or modify external systems. You produce ' +
  'structured output matching the provided tool schema. Be specific, terse, and ' +
  'grounded only in the provided context.';

const SUBMIT_TOOL_NAME = 'submit_chief_of_staff_briefing';

/** JSON Schema mirror of ChiefOfStaffOutput. Anthropic enforces this via tool use. */
const SUBMIT_TOOL_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  required: [
    'headline',
    'companyHealth',
    'perProject',
    'topRisks',
    'topOpportunities',
    'ceoPriorities',
  ],
  properties: {
    headline: { type: 'string', description: 'One-sentence executive summary.' },
    companyHealth: {
      type: 'string',
      enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
    },
    perProject: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'health', 'summary', 'keyMetrics'],
        properties: {
          projectSlug: { type: 'string' },
          health: {
            type: 'string',
            enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
          },
          summary: { type: 'string' },
          keyMetrics: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'value'],
              properties: {
                name: { type: 'string' },
                value: { type: 'number' },
                unit: { type: 'string' },
              },
            },
          },
        },
      },
    },
    topRisks: {
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
    topOpportunities: {
      type: 'array',
      items: {
        type: 'object',
        required: ['projectSlug', 'priority', 'description', 'recommendedAction'],
        properties: {
          projectSlug: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          description: { type: 'string' },
          recommendedAction: { type: 'string' },
        },
      },
    },
    ceoPriorities: {
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

/**
 * Anthropic-backed implementation using tool use for structured output.
 *
 * The model is forced to call `submit_chief_of_staff_briefing` with the briefing payload —
 * Anthropic validates the input against the tool's JSON schema before returning, so
 * malformed output never reaches us.
 */
export class AnthropicLlmClient implements LlmClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: AnthropicConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-6';
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async generate(ctx: CompanyContext, reportType: ReportType): Promise<ChiefOfStaffOutput> {
    const userPrompt =
      reportType === 'weekly_report' ? weeklyReportPrompt(ctx) : dailyBriefingPrompt(ctx);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: SUBMIT_TOOL_NAME,
          description:
            'Submit the structured chief-of-staff briefing. You MUST call this exactly once with the full payload.',
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
        `AnthropicLlmClient: expected tool_use "${SUBMIT_TOOL_NAME}" in response, got: ` +
          response.content.map((b) => b.type).join(', '),
      );
    }
    return ensureChiefOfStaffOutput(toolUse.input);
  }
}
