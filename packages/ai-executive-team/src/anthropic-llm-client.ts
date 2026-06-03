import Anthropic from '@anthropic-ai/sdk';
import type { BoardDigestOutput } from '@ai-company/shared-types';
import type { ExecutiveTeamInput } from './input';
import type { ExecutiveTeamLlmClient } from './llm-client';
import { ensureBoardDigestOutput } from './llm-client';
import { boardDigestPrompt } from './prompts/board-digest';
import { boardReviewPrompt } from './prompts/board-review';

const SYSTEM_PROMPT =
  'You are the AI Executive Team for an AI-Native company. You read what the individual ' +
  'AI executives (CTO, COO, CFO, VP Marketing, VP Sales, Chief of Staff) reported and ' +
  'synthesize a board-level digest for the CEO. You are advisory only — never take actions, ' +
  'override executives, or modify external systems. You produce structured output matching ' +
  'the provided tool schema. Be specific, terse, grounded only in the briefs you receive.';

const SUBMIT_TOOL_NAME = 'submit_board_digest';

const SUBMIT_TOOL_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  required: [
    'headline',
    'companyVerdict',
    'executiveSnapshot',
    'convergentThemes',
    'tensions',
    'strategicMoves',
    'ceoOpenQuestions',
  ],
  properties: {
    headline: { type: 'string' },
    companyVerdict: {
      type: 'string',
      enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived'],
    },
    executiveSnapshot: {
      type: 'array',
      items: {
        type: 'object',
        required: ['executiveId', 'displayName', 'headline', 'health', 'topPriority'],
        properties: {
          executiveId: { type: 'string' },
          displayName: { type: 'string' },
          headline: { type: 'string' },
          health: {
            type: 'string',
            enum: ['healthy', 'at_risk', 'critical', 'paused', 'archived', ''],
          },
          topPriority: { type: 'string' },
        },
      },
    },
    convergentThemes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['theme', 'affectedProjects', 'surfacedBy', 'severity'],
        properties: {
          theme: { type: 'string' },
          affectedProjects: { type: 'array', items: { type: 'string' } },
          surfacedBy: { type: 'array', items: { type: 'string' } },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        },
      },
    },
    tensions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'description', 'parties', 'recommendedResolution'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          parties: {
            type: 'array',
            items: {
              type: 'object',
              required: ['executiveId', 'position'],
              properties: {
                executiveId: { type: 'string' },
                position: { type: 'string' },
              },
            },
          },
          recommendedResolution: { type: 'string' },
        },
      },
    },
    strategicMoves: {
      type: 'array',
      items: {
        type: 'object',
        required: ['rank', 'title', 'rationale', 'contributingExecutives'],
        properties: {
          rank: { type: 'integer', minimum: 1 },
          title: { type: 'string' },
          rationale: { type: 'string' },
          contributingExecutives: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    ceoOpenQuestions: { type: 'array', items: { type: 'string' } },
  },
};

export interface AnthropicExecutiveTeamConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class AnthropicExecutiveTeamLlmClient implements ExecutiveTeamLlmClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: AnthropicExecutiveTeamConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-6';
    // Synthesis is the largest of any prompt; give it more headroom.
    this.maxTokens = config.maxTokens ?? 6144;
  }

  async generate(input: ExecutiveTeamInput): Promise<BoardDigestOutput> {
    const userPrompt = boardDigestPrompt(input);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: SUBMIT_TOOL_NAME,
          description:
            'Submit the structured board digest. You MUST call this exactly once with the full payload.',
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
        `AnthropicExecutiveTeamLlmClient: expected tool_use "${SUBMIT_TOOL_NAME}" in response, got: ` +
          response.content.map((b) => b.type).join(', '),
      );
    }
    return ensureBoardDigestOutput(toolUse.input);
  }
}

export { boardReviewPrompt };
