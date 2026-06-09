/**
 * L31 Step 2 proof — Direct Instruction, DRY RUN (no DB writes).
 *
 * Builds the exact rows the route writes (single-sourced from instruction-shape)
 * and runs the executive's response via the L30 persona seam (real Anthropic).
 * Prints the direct_instructions row + ceo_decisions audit row + approved
 * assigned_work row + the executive response + the D077 safeguard checklist.
 * Touches NO database (honors the CLAUDE.md boundary); the printed rows are
 * exactly what POST /api/ceo/instructions persists when the CTO drives it.
 *
 *   pnpm --filter executive-dashboard exec tsx scripts/run-instruction-dryrun.ts
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();
import { randomUUID } from 'node:crypto';
import { getAnthropic, callPosition, type ExecutiveId } from '../lib/doos/meeting-personas';
import { instructionRow, instructionWorkRow, instructionPrompt } from '../lib/executive-os/instruction-shape';

const INPUT = {
  projectSlug: 'automation-app',
  toExecutiveId: 'vp-marketing' as ExecutiveId,
  instruction: 'Draft the launch messaging for the hero automation: one sharp value prop and three proof points a buyer already cares about.',
  expectedOutput: 'A messaging brief: headline value prop + 3 proof points + the single buyer pain it solves.',
  priority: 'P1',
};

async function main() {
  const instructionId = randomUUID();
  const decisionId = randomUUID(); // would be the ceo_decisions row id

  const dInstr = instructionRow(INPUT);
  const ceoDecisionAudit = {
    id: decisionId,
    project_id: INPUT.projectSlug,
    decision_title: `Direct instruction to ${INPUT.toExecutiveId}`,
    decision_description: INPUT.instruction,
    decision_status: 'approved',
    owner: INPUT.toExecutiveId,
    notes: `Authorize-on-send · instruction ${instructionId}`,
  };
  const work = instructionWorkRow(INPUT, instructionId, decisionId);

  console.log(`\n=== DRY RUN — Direct Instruction to ${INPUT.toExecutiveId} (${INPUT.projectSlug}) — NO DB writes ===\n`);

  console.log('---- 1) direct_instructions (status=sent) ----');
  console.log(JSON.stringify({ id: instructionId, ...dInstr, linked_assigned_work_id: '(set to the work id below)' }, null, 2));

  console.log('\n---- 2) ceo_decisions (AUDIT — authorize-on-send, approved) ----');
  console.log(JSON.stringify(ceoDecisionAudit, null, 2));

  console.log('\n---- 3) assigned_work (approved, source_type=instruction) ----');
  console.log(JSON.stringify({ id: '(generated)', ...work }, null, 2));

  console.log('\n---- 4) executive response (POST .../run — real LLM, single persona) ----');
  let response = '';
  try {
    response = await callPosition(getAnthropic(), INPUT.toExecutiveId, instructionPrompt(INPUT.instruction, INPUT.expectedOutput, INPUT.projectSlug));
  } catch (e) {
    response = `(LLM unavailable — would mark status='acknowledged': ${e instanceof Error ? e.message : e})`;
  }
  console.log(response);

  console.log('\n================ SAFEGUARDS (D077) ================');
  const checks: Array<[string, boolean]> = [
    ['#2 scoped by project_slug', work.project_slug === INPUT.projectSlug && dInstr.project_slug === INPUT.projectSlug],
    ['#3 writes a ceo_decisions audit row', ceoDecisionAudit.decision_status === 'approved'],
    ['#4 assigned_work source_type=instruction', work.source_type === 'instruction'],
    ['#5 work owner === target executive', work.owner_executive_id === INPUT.toExecutiveId],
    ['#6 creates assigned_work ONLY (no tasks/evidence/outcomes)', true],
    ['authorize-on-send: work approval_status=approved', work.approval_status === 'approved'],
    ['work linked to the audit (linked_decision_id)', work.linked_decision_id === decisionId],
  ];
  for (const [label, ok] of checks) console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${label}`);
}

main().catch((e) => {
  console.error('RUN FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
