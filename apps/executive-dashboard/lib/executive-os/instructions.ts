import 'server-only';

/**
 * L31 — Direct Instructions (managerial 1:1, spec §2). The CEO instructs ONE
 * executive directly. Unlike a directive (propose → approve), a direct
 * instruction IS the authorization — authorize-on-send:
 *   direct_instructions (sent) + ceo_decisions (audit) + assigned_work
 *   (approval_status='approved', source_type='instruction', linked_decision_id).
 *
 * Safeguards (D077) enforced here:
 *   #1 CEO-only — the whole dashboard is gated to the single CEO operator (proxy.ts).
 *   #2 every instruction scoped by project_slug (business validated enabled).
 *   #3 every instruction writes a ceo_decisions audit row (authorize-on-send).
 *   #4 creates assigned_work with source_type='instruction'.
 *   #5 assigned_work.owner_executive_id === the instruction's target executive.
 *   #6 instructions create assigned_work ONLY — never tasks/evidence/outcomes.
 *   #7 task creation stays in the normal post-assignment execution spine.
 *   #8 the workspace shows the instruction AND its assigned_work.
 *
 * The run step reuses the L30 meeting-personas LLM seam (single executive). No
 * new LLM machinery.
 */

import { getSupabaseAdmin } from '../doos/supabase-admin';
import { createDecision } from '../ceo-operating-system';
import {
  getAnthropic,
  callInstructionResponse,
  type ExecutiveId,
  type InstructionResponseResult,
} from '../doos/meeting-personas';
import { EXECUTIVE_IDS } from './executives';
import {
  instructionRow,
  instructionWorkRow,
  instructionPrompt,
  instructionContinuePrompt,
  type InstructionInput,
} from './instruction-shape';

export type CreateInstructionInput = InstructionInput;

export interface InstructionResult {
  instructionId: string;
  decisionId: string;
  assignedWorkId: string;
}

function isExec(id: string): id is ExecutiveId {
  return (EXECUTIVE_IDS as readonly string[]).includes(id);
}

export async function createInstruction(input: CreateInstructionInput): Promise<InstructionResult> {
  const supa = getSupabaseAdmin();
  if (!isExec(input.toExecutiveId)) throw new Error(`Unknown executive '${input.toExecutiveId}'`);
  if (!input.instruction.trim()) throw new Error('instruction is required');

  // #2 — scope guard: the business must exist and be enabled.
  const { data: biz } = await supa
    .from('project_definitions')
    .select('slug')
    .eq('slug', input.projectSlug)
    .eq('enabled', true)
    .maybeSingle();
  if (!biz) throw new Error(`Unknown or disabled business '${input.projectSlug}'`);

  // 1) direct_instructions (sent).
  const { data: instr, error: iErr } = await supa
    .from('direct_instructions')
    .insert(instructionRow(input))
    .select('id')
    .single();
  if (iErr || !instr) throw new Error(iErr?.message ?? 'failed to create instruction');

  // 2) ceo_decisions audit (#3) — the authorization-of-record (approved).
  const decision = await createDecision({
    sourceActionId: null,
    projectId: input.projectSlug,
    decisionTitle: `Direct instruction to ${input.toExecutiveId}`,
    decisionDescription: input.instruction.trim(),
    decisionStatus: 'approved',
    owner: input.toExecutiveId,
    dueDate: null,
    priority: input.priority ?? 'P2',
    notes: `Authorize-on-send · instruction ${instr.id}`,
  });

  // 3) assigned_work — approved, source_type='instruction' (#4/#5/#6).
  const { data: work, error: wErr } = await supa
    .from('assigned_work')
    .insert(instructionWorkRow(input, instr.id, decision.id))
    .select('id')
    .single();
  if (wErr || !work) throw new Error(wErr?.message ?? 'failed to create assigned_work');

  // Link the instruction to its formal work item.
  await supa.from('direct_instructions').update({ linked_assigned_work_id: work.id }).eq('id', instr.id);

  return { instructionId: instr.id as string, decisionId: decision.id, assignedWorkId: work.id as string };
}

/** Reusable single-executive response (L30 persona seam) — structured (OF-005). */
export async function respondToInstruction(
  executiveId: ExecutiveId,
  prompt: string,
): Promise<InstructionResponseResult> {
  const client = getAnthropic();
  return callInstructionResponse(client, executiveId, prompt);
}

/**
 * OF-005 — apply a structured instruction response to direct_instructions + the
 * linked assigned_work, closing or holding the loop:
 *   - needsCeoInput → store the QUESTION in `response`, set awaiting_ceo_input=true,
 *     stamp the work's status_changed_at so the classifier reads `awaiting_ceo_input`
 *     with correct aging. Execution is NOT advanced (the exec is blocked on the CEO).
 *   - otherwise     → store the answer, clear awaiting, advance the work to
 *     in_progress (stamping status_changed_at).
 */
async function applyInstructionResponse(
  supa: ReturnType<typeof getSupabaseAdmin>,
  instr: { id: string; linked_assigned_work_id: string | null },
  result: InstructionResponseResult,
  status: string,
  extra: Record<string, unknown> = {},
): Promise<{ status: string; response: string; awaitingCeoInput: boolean }> {
  const awaiting = result.needsCeoInput;
  const responseText = awaiting ? result.question : result.response;
  const now = new Date().toISOString();

  await supa
    .from('direct_instructions')
    .update({
      status,
      response: responseText || null,
      awaiting_ceo_input: awaiting,
      responded_at: now,
      ...extra,
    })
    .eq('id', instr.id);

  if (instr.linked_assigned_work_id) {
    if (awaiting) {
      // Entered awaiting-CEO-input — not an execution transition, but stamp so
      // "days in current state" reflects when the question was asked (AC13).
      await supa
        .from('assigned_work')
        .update({ status_changed_at: now })
        .eq('id', instr.linked_assigned_work_id);
    } else {
      // Advance into execution (instructions never create tasks/evidence — #6/#7).
      await supa
        .from('assigned_work')
        .update({ execution_status: 'in_progress', status_changed_at: now })
        .eq('id', instr.linked_assigned_work_id)
        .eq('execution_status', 'open');
    }
  }
  return { status, response: responseText, awaitingCeoInput: awaiting };
}

export async function runInstruction(
  id: string,
): Promise<{ status: string; response: string; awaitingCeoInput: boolean }> {
  const supa = getSupabaseAdmin();
  const { data: instr, error } = await supa.from('direct_instructions').select('*').eq('id', id).single();
  if (error || !instr) throw new Error('instruction not found');
  if (!isExec(instr.to_executive_id)) throw new Error('invalid target executive');

  let result: InstructionResponseResult;
  let status = 'responded';
  try {
    result = await respondToInstruction(
      instr.to_executive_id,
      instructionPrompt(instr.instruction, instr.expected_output ?? null, instr.project_slug),
    );
  } catch {
    // L23 lesson: degrade gracefully — acknowledged without a response, never crash.
    result = { needsCeoInput: false, question: '', response: '' };
    status = 'acknowledged';
  }
  return applyInstructionResponse(supa, instr, result, status);
}

/**
 * OF-005 — the CEO answers an executive's clarifying question in-thread, closing
 * the stall. Stores ceo_response, clears awaiting_ceo_input, re-invokes the
 * executive with the full thread, and applies the continued response (which may,
 * if still blocked, ask one more question — the loop holds, never stalls silently).
 * project_slug-scoped (the instruction carries it); CEO-only (dashboard-gated).
 */
export async function respondToCeoInput(
  id: string,
  ceoResponse: string,
): Promise<{ status: string; response: string; awaitingCeoInput: boolean }> {
  if (!ceoResponse.trim()) throw new Error('ceoResponse is required');
  const supa = getSupabaseAdmin();
  const { data: instr, error } = await supa.from('direct_instructions').select('*').eq('id', id).single();
  if (error || !instr) throw new Error('instruction not found');
  if (!isExec(instr.to_executive_id)) throw new Error('invalid target executive');

  const question = (instr.response as string | null) ?? '';

  let result: InstructionResponseResult;
  let status = 'responded';
  try {
    result = await respondToInstruction(
      instr.to_executive_id,
      instructionContinuePrompt(
        instr.instruction,
        instr.expected_output ?? null,
        instr.project_slug,
        question,
        ceoResponse.trim(),
      ),
    );
  } catch {
    result = { needsCeoInput: false, question: '', response: '' };
    status = 'acknowledged';
  }
  // Persist the CEO's reply alongside the continued response.
  return applyInstructionResponse(supa, instr, result, status, { ceo_response: ceoResponse.trim() });
}
