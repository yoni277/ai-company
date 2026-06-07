import Anthropic from '@anthropic-ai/sdk';
import type {
  CompanyContext,
  ReportType,
  ResearchQuery,
  ResearchSource,
  VpMarketingOutput,
} from '@ai-company/shared-types';
import { getResearchCapability, RESEARCH_CAPABILITY } from '@ai-company/ai-chief-of-staff';
import type { VpMarketingLlmClient } from './llm-client';
import { ensureVpMarketingOutput } from './llm-client';
import { marketingBriefingPrompt } from './prompts/marketing-briefing';
import { marketingReviewPrompt } from './prompts/marketing-review';

const SYSTEM_PROMPT_BASE =
  'You are the AI VP Marketing for an AI-Native company. You are advisory only — you never ' +
  'launch campaigns, send messages, spend ad budget, or modify external systems. You produce ' +
  'structured marketing output matching the provided tool schema. Be specific, terse, and ' +
  'grounded only in the provided context.';

const RESEARCH_INSTRUCTION =
  '\n\nYou also have access to a `research(query, allowedDomains?)` tool that fetches ' +
  'information from the public web. Use it ONLY when the directive requires external ' +
  'information you do not already have (e.g. competitor features at named URLs, market data, ' +
  'third-party docs). You may call it at most 3 times total. When a claim in your report ' +
  'depends on a fetched source, name the source URL inline so the operator can audit it. ' +
  'When `research` is not needed, call `submit_vp_marketing_report` directly. After every ' +
  'research call, re-evaluate whether more research is needed; if not, submit.';

const SUBMIT_TOOL_NAME = 'submit_vp_marketing_report';
const RESEARCH_TOOL_NAME = 'research';
const MAX_RESEARCH_CALLS = 3;
const MAX_TURNS = 8;

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
    // P005A — Directive → TaskProposal fan-out. Optional. Emit AT MOST 3
    // proposals when responding to a directive. Each capabilityRequired is
    // a deterministic capability slug (never a vendor name). The platform
    // dedupes by fingerprint and the CEO promotes each proposal to a Task.
    proposedTasks: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        required: ['title', 'capabilityRequired'],
        properties: {
          title: { type: 'string', maxLength: 80 },
          description: { type: 'string' },
          capabilityRequired: { type: 'string' },
          proposalType: {
            type: 'string',
            enum: ['action', 'research', 'decision', 'escalation'],
          },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          dueInDays: { type: 'integer', minimum: 0 },
        },
      },
    },
  },
};

const RESEARCH_TOOL_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  required: ['query'],
  properties: {
    query: { type: 'string' },
    maxResults: { type: 'integer', minimum: 1, maximum: 10 },
    allowedDomains: { type: 'array', items: { type: 'string' } },
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

    // Research capability is OPTIONAL. When no backend is registered the
    // model only sees the submit tool — identical to pre-Phase-2A behavior.
    const researchCap = getResearchCapability(RESEARCH_CAPABILITY);

    const tools: Anthropic.Tool[] = [
      {
        name: SUBMIT_TOOL_NAME,
        description:
          'Submit the structured VP Marketing report. Call exactly once when your analysis is complete.',
        input_schema: SUBMIT_TOOL_INPUT_SCHEMA,
      },
    ];
    if (researchCap) {
      tools.push({
        name: RESEARCH_TOOL_NAME,
        description:
          'Fetch information from the public web. Use to gather competitor features, market data, or third-party documentation referenced in the directive. Max 3 calls per report.',
        input_schema: RESEARCH_TOOL_INPUT_SCHEMA,
      });
    }

    const systemPrompt = researchCap
      ? `${SYSTEM_PROMPT_BASE}${RESEARCH_INSTRUCTION}`
      : SYSTEM_PROMPT_BASE;

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userPrompt },
    ];

    const sources: ResearchSource[] = [];
    let researchCallsUsed = 0;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        tools,
        // tool_choice = 'any' forces SOME tool but lets the model choose
        // between research and submit per turn. With no research capability
        // there's only one tool, so this is equivalent to forced submit.
        tool_choice: { type: 'any' },
        messages,
      });

      const submitBlock = response.content.find(
        (b): b is Anthropic.ToolUseBlock =>
          b.type === 'tool_use' && b.name === SUBMIT_TOOL_NAME,
      );
      if (submitBlock) {
        const output = ensureVpMarketingOutput(submitBlock.input);
        return sources.length > 0 ? { ...output, researchSources: sources } : output;
      }

      const researchBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock =>
          b.type === 'tool_use' && b.name === RESEARCH_TOOL_NAME,
      );
      if (researchBlocks.length === 0) {
        throw new Error(
          `AnthropicVpMarketingLlmClient: turn ${turn} returned no tool_use; got blocks: ` +
            response.content.map((b) => b.type).join(', '),
        );
      }

      // Append the assistant turn so the API has continuity, then resolve
      // each research call into a tool_result block to feed back.
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of researchBlocks) {
        if (researchCallsUsed >= MAX_RESEARCH_CALLS) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({
              error: `research_call_cap_reached:${MAX_RESEARCH_CALLS}`,
            }),
            is_error: true,
          });
          continue;
        }
        researchCallsUsed += 1;
        const query = block.input as ResearchQuery;
        try {
          const result = await researchCap!.run(query);
          if (result.sources.length > 0) sources.push(...result.sources);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // Record a placeholder source so the report knows a call failed.
          sources.push({
            url: `error://research/${block.id}`,
            title: null,
            snippet: `research call failed: ${message}`,
            fetchedAt: new Date().toISOString(),
            contentTier: 'E2',
            citation: null,
          });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: message }),
            is_error: true,
          });
        }
      }
      messages.push({ role: 'user', content: toolResults });
    }

    throw new Error(
      `AnthropicVpMarketingLlmClient: exceeded MAX_TURNS=${MAX_TURNS} without submitting`,
    );
  }
}
