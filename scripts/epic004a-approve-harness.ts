/**
 * EPIC-004A — live approve-gate harness (Phase 1 sign-off aid).
 *
 * Exercises the REAL ceo_decisions gate against a live `assigned_work` row using
 * the pure orchestration in work-control-core bound to a service-role Supabase
 * client. Two modes, by design:
 *
 *   --check    READ-ONLY. Fetch the row, print its state, and assert that a
 *              dateless approve is rejected (NeedsCeoCompletionError). Writes
 *              nothing. Safe for the Builder to run.
 *
 *   --approve  MUTATING. Set a due_date on the row, then approve it through the
 *              gate → inserts a ceo_decisions row, flips proposed→approved, and
 *              stamps status_changed_at. This writes to the SHARED DB, so it is
 *              Cowork's to run (DB owner/verifier), never the Builder's.
 *
 * Usage (from repo root):
 *   node --import tsx scripts/epic004a-approve-harness.ts --check   <work-id>
 *   node --import tsx scripts/epic004a-approve-harness.ts --approve <work-id> [--due 2026-06-30]
 *
 * Env: reads apps/executive-dashboard/.env.local (NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY, schema ai_company).
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import {
  approveWork,
  NeedsCeoCompletionError,
  type WorkSpineStore,
  type ApprovableWork,
  type DecisionRequest,
  type ExecutionStatus,
} from '../apps/executive-dashboard/lib/executive-os/work-control-core.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../apps/executive-dashboard/.env.local') });

const DEFAULT_WORK_ID = '7d896618-d57e-4eb2-af34-f34599dbd4b2';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const MODE_APPROVE = process.argv.includes('--approve');
const MODE_CHECK = process.argv.includes('--check') || !MODE_APPROVE;
const WORK_ID =
  process.argv.find((a, i) => i >= 2 && !a.startsWith('--') && process.argv[i - 1] !== '--due') ??
  DEFAULT_WORK_ID;
const DUE = arg('--due') ?? '2026-06-30';

function makeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in apps/executive-dashboard/.env.local',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: process.env.SUPABASE_SCHEMA ?? 'ai_company' },
  });
}

const supa = makeClient();

/** A WorkSpineStore over the live DB (mirrors work-control.ts's adapter + createDecision). */
const store: WorkSpineStore = {
  now: () => new Date().toISOString(),
  async getApprovable(workId: string): Promise<ApprovableWork | null> {
    const { data, error } = await supa
      .from('assigned_work')
      .select('id, project_slug, title, detail, owner_executive_id, approval_status, due_date, review_date')
      .eq('id', workId)
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      projectSlug: data.project_slug,
      title: data.title,
      detail: data.detail ?? null,
      ownerExecutiveId: data.owner_executive_id ?? null,
      approvalStatus: data.approval_status,
      dueDate: data.due_date ?? null,
      reviewDate: data.review_date ?? null,
    };
  },
  async createDecision(input: DecisionRequest): Promise<{ id: string }> {
    const { data, error } = await supa
      .from('ceo_decisions')
      .insert({
        source_action_id: null,
        project_id: input.projectId,
        decision_title: input.decisionTitle,
        decision_description: input.decisionDescription,
        decision_status: 'approved',
        owner: input.owner,
        due_date: input.dueDate,
        priority: 'P2',
        notes: input.notes ?? null,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'failed to insert ceo_decisions');
    return { id: data.id as string };
  },
  async markApproved(workId, decisionId, at) {
    const { error } = await supa
      .from('assigned_work')
      .update({ approval_status: 'approved', linked_decision_id: decisionId, status_changed_at: at })
      .eq('id', workId)
      .eq('approval_status', 'proposed');
    if (error) throw new Error(error.message);
  },
  async markRejected(workId, at) {
    const { error } = await supa
      .from('assigned_work')
      .update({ approval_status: 'rejected', status_changed_at: at })
      .eq('id', workId)
      .eq('approval_status', 'proposed');
    if (error) throw new Error(error.message);
  },
  async setExecution(workId, to: ExecutionStatus, at, expectFrom) {
    let q = supa.from('assigned_work').update({ execution_status: to, status_changed_at: at }).eq('id', workId);
    if (expectFrom) q = q.eq('execution_status', expectFrom);
    const { error } = await q;
    if (error) throw new Error(error.message);
  },
};

async function dumpRow(label: string) {
  const { data } = await supa
    .from('assigned_work')
    .select('id, title, approval_status, execution_status, owner_executive_id, due_date, review_date, status_changed_at, linked_decision_id, linked_task_id')
    .eq('id', WORK_ID)
    .single();
  console.log(`\n[${label}]`, JSON.stringify(data, null, 2));
  return data;
}

async function main() {
  console.log(`EPIC-004A approve-harness · work-id=${WORK_ID} · mode=${MODE_APPROVE ? 'APPROVE (mutating)' : 'CHECK (read-only)'}`);
  const before = await dumpRow('before');
  if (!before) throw new Error(`work ${WORK_ID} not found`);

  if (MODE_CHECK && !MODE_APPROVE) {
    // READ-ONLY: prove the gate fires on the live (dateless) row.
    try {
      await approveWork(store, WORK_ID);
      console.error('\n✗ UNEXPECTED: approve succeeded on a dateless row (gate did not fire).');
      process.exit(1);
    } catch (e) {
      if (e instanceof NeedsCeoCompletionError) {
        console.log(`\n✓ PASS: dateless approve rejected — "${e.message}"`);
        console.log('  (no ceo_decisions written, no flip — read-only check complete)');
        return;
      }
      throw e;
    }
  }

  // MUTATING (Cowork): set a due_date, then approve through the gate.
  console.log(`\n[approve] setting due_date=${DUE} then approving…`);
  const at = new Date().toISOString();
  const { error: dueErr } = await supa
    .from('assigned_work')
    .update({ due_date: DUE, status_changed_at: at })
    .eq('id', WORK_ID);
  if (dueErr) throw new Error(`set due_date failed: ${dueErr.message}`);

  const result = await approveWork(store, WORK_ID, { notes: `EPIC-004A harness approve ${at}` });
  console.log('\n✓ approved:', JSON.stringify(result, null, 2));

  await dumpRow('after');
  const { data: decision } = await supa
    .from('ceo_decisions')
    .select('id, decision_title, decision_status, owner, due_date, project_id, notes')
    .eq('id', result.decisionId)
    .single();
  console.log('\n[ceo_decisions row]', JSON.stringify(decision, null, 2));
  console.log(
    '\nNote: approve creates the ceo_decisions audit + flips approval_status. Child task linkage ' +
      '(tasks.assigned_work_id / linked_task_id) is the promote/backfill path (Phase 3), not the approve gate.',
  );
}

main().catch((e) => {
  console.error('\n✗ harness error:', e instanceof Error ? e.message : e);
  process.exit(1);
});
