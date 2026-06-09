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
import { getAnthropic, callPosition, type ExecutiveId } from '../doos/meeting-personas';
import { EXECUTIVE_IDS } from './executives';
import { instructionRow, instructionWorkRow, instructionPrompt, type InstructionInput } from './instruction-shape';

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

/** Reusable single-executive response (L30 persona seam). */
export async function respondToInstruction(
  executiveId: ExecutiveId,
  instruction: string,
  expectedOutput: string | null,
  projectSlug: string,
): Promise<string> {
  const client = getAnthropic();
  return callPosition(client, executiveId, instructionPrompt(instruction, expectedOutput, projectSlug));
}

export async function runInstruction(id: string): Promise<{ status: string; response: string }> {
  const supa = getSupabaseAdmin();
  const { data: instr, error } = await supa.from('direct_instructions').select('*').eq('id', id).single();
  if (error || !instr) throw new Error('instruction not found');
  if (!isExec(instr.to_executive_id)) throw new Error('invalid target executive');

  let response: string;
  let status = 'responded';
  try {
    response = await respondToInstruction(
      instr.to_executive_id,
      instr.instruction,
      instr.expected_output ?? null,
      instr.project_slug,
    );
  } catch {
    // L23 lesson: degrade gracefully — acknowledged without a response, never crash.
    response = '';
    status = 'acknowledged';
  }

  await supa
    .from('direct_instructions')
    .update({ status, response: response || null, responded_at: new Date().toISOString() })
    .eq('id', id);
  // Advance the work into execution (still gated/approved; instructions never
  // create tasks/evidence/outcomes — that stays in the normal spine, #6/#7).
  if (instr.linked_assigned_work_id) {
    await supa
      .from('assigned_work')
      .update({ execution_status: 'in_progress' })
      .eq('id', instr.linked_assigned_work_id)
      .eq('execution_status', 'open');
  }
  return { status, response };
}
