/**
 * EPIC-004A — Phase 3 backfill (D079 spec §3, AC6/AC11).
 *
 * Make every `task` an execution child of the spine: backfill
 * tasks.assigned_work_id. Where a task came from a directive proposal that has
 * no spine row yet, CREATE the parent assigned_work and link. Honest:
 *   - owner = the authoring executive (task.proposal → source_executive_id,
 *     else task.owner_id). If neither is known, SKIP + report (never fabricate).
 *   - project_slug resolved from the directive (slug or legacy id). Unresolvable
 *     ⇒ SKIP + report (the spine's project_slug is NOT NULL; never invent a business).
 *   - NO invented deadlines: due_date = the task's real due_at if set, else null
 *     ⇒ undated proposed parents land in Needs CEO Completion.
 *   - approval_status mirrors the proposal's decision (approved if the proposal
 *     was approved/the task is committed, else proposed); execution_status
 *     mirrors the task status (completed→done, in_progress→in_progress, else open).
 *
 * Idempotent: links only NULL rows, and reuses an existing matching parent
 * (source_id+owner+title) instead of duplicating.
 *
 * Modes:
 *   --check   READ-ONLY. Print the no-orphan audit + the exact plan. No writes.
 *   --apply   MUTATING. Create parents, link tasks, set back-links. Writes the
 *             SHARED DB → Cowork's to run. Re-run --check after to verify 0 orphans.
 *
 * Usage (repo root):
 *   node --import tsx scripts/epic004a-phase3-backfill.ts --check
 *   node --import tsx scripts/epic004a-phase3-backfill.ts --apply
 *
 * Env: apps/executive-dashboard/.env.local (service role, schema ai_company).
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../apps/executive-dashboard/.env.local') });

const APPLY = process.argv.includes('--apply');

function makeClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in apps/executive-dashboard/.env.local');
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: process.env.SUPABASE_SCHEMA ?? 'ai_company' },
  });
}
const supa = makeClient();

function normalizePriority(raw: string | null | undefined): string {
  if (!raw) return 'P2';
  if (/^P\d+$/i.test(raw)) return raw.toUpperCase();
  return { high: 'P1', medium: 'P2', low: 'P3' }[raw.toLowerCase()] ?? 'P2';
}

function mapExecutionStatus(taskStatus: string | null): 'open' | 'in_progress' | 'blocked' | 'done' | 'cancelled' {
  switch (taskStatus) {
    case 'completed':
      return 'done';
    case 'in_progress':
      return 'in_progress';
    case 'blocked':
      return 'blocked';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'open';
  }
}

async function resolveDirectiveProjectSlug(targetProjectId: string | null): Promise<string | null> {
  if (!targetProjectId) return null;
  const { data: bySlug } = await supa
    .from('project_definitions')
    .select('slug')
    .eq('slug', targetProjectId)
    .eq('enabled', true)
    .maybeSingle();
  if (bySlug?.slug) return bySlug.slug as string;
  const { data: legacy } = await supa.from('projects').select('slug').eq('id', targetProjectId).maybeSingle();
  if (legacy?.slug) {
    const { data: def } = await supa
      .from('project_definitions')
      .select('slug')
      .eq('slug', legacy.slug)
      .eq('enabled', true)
      .maybeSingle();
    if (def?.slug) return def.slug as string;
  }
  return null;
}

/* ---- AC11 no-orphan audit (read-only) ---- */
async function audit() {
  const { count: tasksTotal } = await supa.from('tasks').select('id', { count: 'exact', head: true });
  const { count: tasksWithoutWork } = await supa
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .is('assigned_work_id', null);
  const { data: work } = await supa.from('assigned_work').select('id, source_type, source_id');
  const rows = (work ?? []) as Array<{ id: string; source_type: string; source_id: string }>;
  const SOURCE_TABLE: Record<string, string> = {
    directive: 'ceo_directives',
    meeting: 'meetings',
    instruction: 'direct_instructions',
  };
  let unresolved = 0;
  const unresolvedSample: string[] = [];
  for (const [type, table] of Object.entries(SOURCE_TABLE)) {
    const ids = rows.filter((r) => r.source_type === type).map((r) => r.source_id);
    if (ids.length === 0) continue;
    const { data: found } = await supa.from(table).select('id').in('id', ids);
    const known = new Set((found ?? []).map((f: { id: string }) => f.id));
    for (const r of rows.filter((x) => x.source_type === type)) {
      if (!known.has(r.source_id)) {
        unresolved += 1;
        if (unresolvedSample.length < 10) unresolvedSample.push(r.id);
      }
    }
  }
  return {
    tasksTotal: tasksTotal ?? 0,
    tasksWithoutWork: tasksWithoutWork ?? 0,
    workTotal: rows.length,
    workWithUnresolvedSource: unresolved,
    unresolvedSampleIds: unresolvedSample,
  };
}

interface PlanItem {
  taskId: string;
  taskTitle: string;
  directiveId: string | null;
  owner: string | null;
  projectSlug: string | null;
  action: 'link-existing' | 'create-parent' | 'skip-no-directive' | 'skip-unscoped' | 'skip-no-owner';
  existingWorkId?: string;
  parent?: Record<string, unknown>;
}

async function buildPlan(): Promise<PlanItem[]> {
  const { data: orphans } = await supa
    .from('tasks')
    .select('id, title, description, directive_id, proposal_id, owner_id, status, due_at, created_at, completed_at')
    .is('assigned_work_id', null);
  const plan: PlanItem[] = [];

  for (const t of orphans ?? []) {
    const base: PlanItem = {
      taskId: t.id,
      taskTitle: t.title,
      directiveId: t.directive_id ?? null,
      owner: null,
      projectSlug: null,
      action: 'skip-no-directive',
    };
    if (!t.directive_id) {
      plan.push(base);
      continue;
    }

    // Authoring executive + proposal payload.
    let owner: string | null = t.owner_id ?? null;
    let title = t.title as string;
    let detail: string | null = t.description ?? null;
    let approvalStatus: 'proposed' | 'approved' = 'proposed';
    if (t.proposal_id) {
      const { data: p } = await supa
        .from('task_proposals')
        .select('source_executive_id, payload, status')
        .eq('id', t.proposal_id)
        .maybeSingle();
      if (p) {
        owner = p.source_executive_id ?? owner;
        title = (p.payload?.title as string) ?? title;
        detail = (p.payload?.description as string) ?? detail;
        approvalStatus = p.status === 'approved' ? 'approved' : 'proposed';
      }
    }
    // A committed task (completed / has a proposal that was approved) ⇒ approved parent.
    if (t.status === 'completed') approvalStatus = 'approved';

    base.owner = owner;
    if (!owner) {
      base.action = 'skip-no-owner';
      plan.push(base);
      continue;
    }

    const { data: directive } = await supa
      .from('ceo_directives')
      .select('target_project_id, priority')
      .eq('id', t.directive_id)
      .maybeSingle();
    const projectSlug = await resolveDirectiveProjectSlug(directive?.target_project_id ?? null);
    base.projectSlug = projectSlug;
    if (!projectSlug) {
      base.action = 'skip-unscoped';
      plan.push(base);
      continue;
    }

    // Existing parent for this directive proposal? (idempotent reuse)
    const { data: existing } = await supa
      .from('assigned_work')
      .select('id, title, owner_executive_id')
      .eq('source_type', 'directive')
      .eq('source_id', t.directive_id);
    const match = (existing ?? []).find(
      (w: { owner_executive_id: string; title: string }) => w.owner_executive_id === owner && w.title === title,
    );
    if (match) {
      base.action = 'link-existing';
      base.existingWorkId = match.id;
      plan.push(base);
      continue;
    }

    const dueDate = t.due_at ? String(t.due_at).slice(0, 10) : null; // real date only, never invented
    const stamp = (t.completed_at ?? t.created_at ?? new Date().toISOString()) as string;
    base.action = 'create-parent';
    base.parent = {
      project_slug: projectSlug,
      source_type: 'directive',
      source_id: t.directive_id,
      owner_executive_id: owner,
      title,
      detail,
      approval_status: approvalStatus,
      execution_status: mapExecutionStatus(t.status),
      priority: normalizePriority(directive?.priority),
      due_date: dueDate,
      review_date: null,
      created_by: owner,
      linked_task_id: t.id,
      status_changed_at: stamp,
    };
    plan.push(base);
  }
  return plan;
}

async function applyPlan(plan: PlanItem[]) {
  let parentsCreated = 0;
  let tasksLinked = 0;
  for (const item of plan) {
    if (item.action === 'create-parent' && item.parent) {
      const { data: created, error } = await supa
        .from('assigned_work')
        .insert(item.parent)
        .select('id')
        .single();
      if (error || !created) throw new Error(`create parent for task ${item.taskId} failed: ${error?.message}`);
      parentsCreated += 1;
      const { error: linkErr } = await supa
        .from('tasks')
        .update({ assigned_work_id: created.id })
        .eq('id', item.taskId)
        .is('assigned_work_id', null);
      if (linkErr) throw new Error(`link task ${item.taskId} failed: ${linkErr.message}`);
      tasksLinked += 1;
    } else if (item.action === 'link-existing' && item.existingWorkId) {
      const { error: linkErr } = await supa
        .from('tasks')
        .update({ assigned_work_id: item.existingWorkId })
        .eq('id', item.taskId)
        .is('assigned_work_id', null);
      if (linkErr) throw new Error(`link task ${item.taskId} failed: ${linkErr.message}`);
      // Best-effort back-link parent → task.
      await supa
        .from('assigned_work')
        .update({ linked_task_id: item.taskId })
        .eq('id', item.existingWorkId)
        .is('linked_task_id', null);
      tasksLinked += 1;
    }
  }
  return { parentsCreated, tasksLinked };
}

async function main() {
  console.log(`EPIC-004A Phase 3 backfill · mode=${APPLY ? 'APPLY (mutating)' : 'CHECK (read-only)'}\n`);

  console.log('[audit BEFORE]', JSON.stringify(await audit(), null, 2));

  const plan = await buildPlan();
  const summary = plan.reduce<Record<string, number>>((acc, p) => {
    acc[p.action] = (acc[p.action] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\n[plan] ${plan.length} orphan task(s):`, JSON.stringify(summary, null, 2));
  for (const p of plan) {
    console.log(
      `  · task ${p.taskId} "${p.taskTitle}" → ${p.action}` +
        (p.action === 'create-parent' ? ` (owner=${p.owner}, slug=${p.projectSlug}, ${JSON.stringify(p.parent && (p.parent as { approval_status: string; execution_status: string }))})` : '') +
        (p.action === 'link-existing' ? ` (work=${p.existingWorkId})` : ''),
    );
  }

  const skips = plan.filter((p) => p.action.startsWith('skip'));
  if (skips.length > 0) {
    console.log(`\n⚠ ${skips.length} task(s) cannot be backfilled honestly (surfaced, not fabricated):`);
    for (const s of skips) console.log(`  · ${s.taskId} → ${s.action}`);
  }

  if (!APPLY) {
    console.log('\n(read-only — no writes. Re-run with --apply to perform the backfill.)');
    return;
  }

  console.log('\n[apply] writing…');
  const res = await applyPlan(plan);
  console.log('[apply] done:', JSON.stringify(res, null, 2));
  console.log('\n[audit AFTER]', JSON.stringify(await audit(), null, 2));
}

main().catch((e) => {
  console.error('\n✗ backfill error:', e instanceof Error ? e.message : e);
  process.exit(1);
});
