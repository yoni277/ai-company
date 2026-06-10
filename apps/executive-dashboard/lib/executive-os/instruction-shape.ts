/**
 * L31 — pure shapes for Direct Instructions, single-sourced so the API route and
 * the proof harness produce IDENTICAL rows (the D077 safeguard shape can't drift).
 * No server-only / DB imports here.
 */

export interface InstructionInput {
  projectSlug: string;
  toExecutiveId: string;
  instruction: string;
  expectedOutput?: string | null;
  priority?: string | undefined;
}

/** direct_instructions row (sent). */
export function instructionRow(input: InstructionInput) {
  return {
    project_slug: input.projectSlug,
    from_actor: 'ceo' as const,
    to_executive_id: input.toExecutiveId,
    instruction: input.instruction.trim(),
    expected_output: input.expectedOutput ?? null,
    priority: input.priority ?? 'P2',
    status: 'sent' as const,
  };
}

/**
 * assigned_work row an instruction creates — the safeguard shape (#4/#5/#6):
 * source_type='instruction', owner == target, approved (authorize-on-send),
 * linked to the ceo_decisions audit. NO task/evidence/outcome is created (#6).
 */
export function instructionWorkRow(input: InstructionInput, instructionId: string, decisionId: string) {
  return {
    project_slug: input.projectSlug, // #2
    source_type: 'instruction' as const, // #4
    source_id: instructionId,
    owner_executive_id: input.toExecutiveId, // #5 — owner IS the target
    title: input.instruction.trim().slice(0, 120),
    detail: input.expectedOutput
      ? `${input.instruction.trim()}\n\nExpected: ${input.expectedOutput}`
      : input.instruction.trim(),
    approval_status: 'approved' as const, // authorize-on-send
    execution_status: 'open' as const,
    priority: input.priority ?? 'P2',
    linked_decision_id: decisionId, // #3
    created_by: 'ceo' as const,
  };
}

/** Single-executive instruction prompt (reuses the meeting-persona seam). */
export function instructionPrompt(
  instruction: string,
  expectedOutput: string | null,
  projectSlug: string,
): string {
  return [
    `BUSINESS: ${projectSlug}`,
    `The CEO has given you a direct instruction:`,
    `"${instruction}"`,
    expectedOutput ? `Expected output: ${expectedOutput}` : '',
    `Respond with your plan / answer. Be specific and grounded; advisory only (you do not execute external systems). 3-6 sentences. If — and only if — you genuinely cannot proceed without a specific CEO decision or clarification, set needs_ceo_input and ask ONE specific question instead of guessing.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * OF-005 — continuation prompt: the executive asked the CEO a question and the
 * CEO replied. Re-invoke with the full thread so the executive continues (and may,
 * if still blocked, ask one more question).
 */
export function instructionContinuePrompt(
  instruction: string,
  expectedOutput: string | null,
  projectSlug: string,
  question: string,
  ceoResponse: string,
): string {
  return [
    `BUSINESS: ${projectSlug}`,
    `The CEO gave you this direct instruction:`,
    `"${instruction}"`,
    expectedOutput ? `Expected output: ${expectedOutput}` : '',
    `You asked the CEO: "${question}"`,
    `The CEO replied: "${ceoResponse}"`,
    `Now continue: incorporate the CEO's answer and produce your response / plan. Advisory only. 3-6 sentences. Only ask another question (needs_ceo_input) if you are STILL genuinely blocked on a specific decision.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
