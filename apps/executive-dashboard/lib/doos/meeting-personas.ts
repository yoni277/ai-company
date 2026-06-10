/**
 * L30 — Executive meeting personas + LLM invocation.
 *
 * Reuses the directive fan-out's executive-LLM seam: the same 6 personas and the
 * same Anthropic SDK the executives use (claude-sonnet-4-6, ANTHROPIC_API_KEY).
 * The executives' own clients are tied to their structured `generate(ctx,
 * reportType)` briefing flow; a meeting needs free-form deliberation, so this
 * module invokes the same personas with meeting-specific prompts:
 *   - callPosition  → opening position (text)
 *   - callChallenge → MUST challenge a specific peer or concur-with-reasoning
 *                     (tool-use → {stance, target, claimAddressed, text})
 *   - callRebuttal  → a challenged exec responds once (text)
 *   - callSynthesis → CoS structured close (tool-use → summary/decisions/work/…)
 *
 * Advisory framing matches the executives (never act, never spend) — these are
 * recommendations the CEO approves, not commitments.
 */

import Anthropic from '@anthropic-ai/sdk';

export type ExecutiveId =
  | 'chief-of-staff'
  | 'cto'
  | 'coo'
  | 'cfo'
  | 'vp-marketing'
  | 'vp-sales';

interface Persona {
  role: string;
  mandate: string;
}

export const MEETING_PERSONAS: Record<ExecutiveId, Persona> = {
  'chief-of-staff': {
    role: 'Chief of Staff',
    mandate:
      'You moderate and synthesize. You own the operating cadence: frame the question, keep the debate on the decision, weigh evidence over assertion, and surface dissent honestly.',
  },
  cto: {
    role: 'CTO',
    mandate: 'You own technical feasibility, architecture, and engineering risk.',
  },
  coo: {
    role: 'COO',
    mandate: 'You own operations, execution, throughput, and delivery.',
  },
  cfo: {
    role: 'CFO',
    mandate: 'You own financial modeling, ROI, capital discipline, and runway. Never fabricate figures.',
  },
  'vp-marketing': {
    role: 'VP Marketing',
    mandate: 'You own demand generation, channels, and top-of-funnel pipeline.',
  },
  'vp-sales': {
    role: 'VP Sales',
    mandate: 'You own revenue conversion and the sales funnel. Never fabricate deals or values.',
  },
};

function systemFor(id: ExecutiveId): string {
  const p = MEETING_PERSONAS[id];
  return [
    `You are the AI ${p.role} for an AI-Native company, in a live executive meeting.`,
    p.mandate,
    'You are advisory only — you never take actions, spend, or modify external systems; your output is a recommendation the CEO approves.',
    'Be specific, terse, and grounded ONLY in the agenda and evidence provided. Do not fabricate numbers, customers, or facts.',
    'This is a real deliberation, not a status report. Take a clear position. When you disagree with a peer, say so directly and explain why.',
  ].join(' ');
}

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required to run a meeting.');
  return new Anthropic({ apiKey });
}

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

async function text(client: Anthropic, id: ExecutiveId, user: string, maxTokens = 700): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemFor(id),
    messages: [{ role: 'user', content: user }],
  });
  const block = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return (block?.text ?? '').trim();
}

export function callPosition(client: Anthropic, id: ExecutiveId, prompt: string): Promise<string> {
  return text(client, id, prompt);
}

export function callRebuttal(client: Anthropic, id: ExecutiveId, prompt: string): Promise<string> {
  return text(client, id, prompt);
}

export interface ChallengeResult {
  stance: 'challenge' | 'concur';
  target: ExecutiveId | null;
  claimAddressed: string;
  text: string;
}

const CHALLENGE_TOOL: Anthropic.Tool = {
  name: 'submit_challenge',
  description:
    'Submit your meeting turn: either challenge a specific peer\'s claim, or concur with one — always with reasoning.',
  input_schema: {
    type: 'object',
    properties: {
      stance: { type: 'string', enum: ['challenge', 'concur'] },
      target_executive: {
        type: 'string',
        description: 'The executive id whose claim you are addressing (e.g. "cfo").',
      },
      claim_addressed: { type: 'string', description: 'The specific claim of theirs you address.' },
      text: { type: 'string', description: 'Your reasoning / counter-evidence (2-4 sentences).' },
    },
    required: ['stance', 'target_executive', 'claim_addressed', 'text'],
  },
};

export async function callChallenge(
  client: Anthropic,
  id: ExecutiveId,
  prompt: string,
): Promise<ChallengeResult> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: systemFor(id),
    tools: [CHALLENGE_TOOL],
    tool_choice: { type: 'tool', name: CHALLENGE_TOOL.name },
    messages: [{ role: 'user', content: prompt }],
  });
  const tool = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === CHALLENGE_TOOL.name,
  );
  const input = (tool?.input ?? {}) as Record<string, unknown>;
  const rawTarget = typeof input.target_executive === 'string' ? input.target_executive : '';
  const target = (Object.keys(MEETING_PERSONAS) as ExecutiveId[]).includes(rawTarget as ExecutiveId)
    ? (rawTarget as ExecutiveId)
    : null;
  return {
    stance: input.stance === 'concur' ? 'concur' : 'challenge',
    target,
    claimAddressed: typeof input.claim_addressed === 'string' ? input.claim_addressed : '',
    text: typeof input.text === 'string' ? input.text : '',
  };
}

export interface SynthesisDecision {
  decision: string;
  rationale: string;
  dissenting_opinions: string[];
  actionable: boolean;
  owner_executive_id: ExecutiveId | null;
  work_title: string;
  work_detail: string;
  due_in_days: number | null;
  /** Stamped after the work row is inserted — the stable decision↔work link. */
  assignedWorkId?: string | null;
}

export interface SynthesisResult {
  summary: string;
  decisions: SynthesisDecision[];
  risks: string[];
  open_questions: string[];
}

const SYNTHESIS_TOOL: Anthropic.Tool = {
  name: 'submit_synthesis',
  description: 'As Chief of Staff, close the meeting: summary, decisions (with dissent), proposed work, risks, open questions.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      decisions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            decision: { type: 'string' },
            rationale: { type: 'string' },
            dissenting_opinions: { type: 'array', items: { type: 'string' } },
            actionable: { type: 'boolean', description: 'true if this decision should create a work item to assign.' },
            owner_executive_id: { type: 'string', description: 'owner exec id when actionable' },
            work_title: { type: 'string' },
            work_detail: { type: 'string' },
            due_in_days: { type: 'number' },
          },
          required: ['decision', 'rationale', 'dissenting_opinions', 'actionable'],
        },
      },
      risks: { type: 'array', items: { type: 'string' } },
      open_questions: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'decisions', 'risks', 'open_questions'],
  },
};

export async function callSynthesis(client: Anthropic, prompt: string): Promise<SynthesisResult> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1800,
    system: systemFor('chief-of-staff'),
    tools: [SYNTHESIS_TOOL],
    tool_choice: { type: 'tool', name: SYNTHESIS_TOOL.name },
    messages: [{ role: 'user', content: prompt }],
  });
  const tool = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === SYNTHESIS_TOOL.name,
  );
  const input = (tool?.input ?? {}) as Record<string, unknown>;
  const rawDecisions = Array.isArray(input.decisions) ? input.decisions : [];
  const decisions: SynthesisDecision[] = rawDecisions.map((d) => {
    const o = (d ?? {}) as Record<string, unknown>;
    const owner = typeof o.owner_executive_id === 'string' ? o.owner_executive_id : '';
    return {
      decision: typeof o.decision === 'string' ? o.decision : '',
      rationale: typeof o.rationale === 'string' ? o.rationale : '',
      dissenting_opinions: Array.isArray(o.dissenting_opinions)
        ? o.dissenting_opinions.filter((x): x is string => typeof x === 'string')
        : [],
      actionable: o.actionable === true,
      owner_executive_id: (Object.keys(MEETING_PERSONAS) as ExecutiveId[]).includes(owner as ExecutiveId)
        ? (owner as ExecutiveId)
        : null,
      work_title: typeof o.work_title === 'string' ? o.work_title : '',
      work_detail: typeof o.work_detail === 'string' ? o.work_detail : '',
      due_in_days: typeof o.due_in_days === 'number' ? o.due_in_days : null,
    };
  });
  return {
    summary: typeof input.summary === 'string' ? input.summary : '',
    decisions,
    risks: Array.isArray(input.risks) ? input.risks.filter((x): x is string => typeof x === 'string') : [],
    open_questions: Array.isArray(input.open_questions)
      ? input.open_questions.filter((x): x is string => typeof x === 'string')
      : [],
  };
}

/* ----------------------------------------------------------------------------
 * OF-005 — Direct-instruction response with a structured CEO-input signal.
 * The executive either answers, or (when it genuinely cannot proceed without a
 * CEO decision) flags `needs_ceo_input` and asks ONE specific question. Reuses
 * the SAME persona seam + tool-use pattern as callChallenge/callSynthesis — no
 * new machinery.
 * -------------------------------------------------------------------------- */

export interface InstructionResponseResult {
  needsCeoInput: boolean;
  question: string;
  response: string;
}

const INSTRUCTION_TOOL: Anthropic.Tool = {
  name: 'respond_to_instruction',
  description:
    "Respond to the CEO's direct instruction. Either provide your answer/plan, OR — only if you genuinely cannot proceed without a specific CEO decision or clarification — set needs_ceo_input=true and ask ONE specific question. Do not invent facts to avoid asking; but do not ask when you can reasonably proceed.",
  input_schema: {
    type: 'object',
    properties: {
      needs_ceo_input: {
        type: 'boolean',
        description: 'true ONLY when you cannot proceed without a specific CEO decision/clarification.',
      },
      question: {
        type: 'string',
        description: 'when needs_ceo_input=true: ONE specific question for the CEO. Otherwise empty.',
      },
      response: {
        type: 'string',
        description: 'your plan/answer (advisory). When blocked, state what you can pending the answer.',
      },
    },
    required: ['needs_ceo_input', 'response'],
  },
};

export async function callInstructionResponse(
  client: Anthropic,
  id: ExecutiveId,
  prompt: string,
): Promise<InstructionResponseResult> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: systemFor(id),
    tools: [INSTRUCTION_TOOL],
    tool_choice: { type: 'tool', name: INSTRUCTION_TOOL.name },
    messages: [{ role: 'user', content: prompt }],
  });
  const tool = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === INSTRUCTION_TOOL.name,
  );
  const input = (tool?.input ?? {}) as Record<string, unknown>;
  const needsCeoInput = input.needs_ceo_input === true;
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  const response = typeof input.response === 'string' ? input.response.trim() : '';
  // Guard: a "needs input" with no question is not actionable — treat as answered.
  return {
    needsCeoInput: needsCeoInput && question.length > 0,
    question,
    response,
  };
}
