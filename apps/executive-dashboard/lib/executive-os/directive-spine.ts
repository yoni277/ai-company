import 'server-only';

/**
 * EPIC-004A — Work Model Convergence (D079). Spec §4 Phase 1, AC3.
 *
 * The MISSING converger: directives are the CEO's most-used input mode, yet
 * historically they fanned out to executive_reports + task_proposals and NEVER
 * touched the work spine. This emits `assigned_work` for each actionable
 * task_proposals row a directive produced, mirroring the MEETING pattern
 * (proposed → ceo_decisions gate), NOT the instruction authorize-on-send.
 *
 *   source_type      = 'directive'  (enum value already exists — wiring, not new types)
 *   source_id        = ceo_directives.id
 *   owner_executive_id = the authoring executive (the proposal's source)
 *   approval_status  = 'proposed'   (the CEO approves through the gate later)
 *   execution_status = 'open'
 *   due_date         = NULL         (NO fabricated deadlines — AC4; the CEO sets
 *                                    a date at approval; dateless ⇒ Needs CEO Completion)
 *
 * Idempotent: re-draining a directive does not duplicate spine rows. Honest:
 * a directive with no resolvable business is NOT fabricated onto some default —
 * it is surfaced as `unscoped` for the CEO to assign (the directive analog of
 * Needs CEO Completion).
 *
 * Cloneable: zero business specifics, project_slug-scoped.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../doos/supabase-admin';
import { getPlatform } from '../platform';
import { getDirectiveById } from '../ceo-operating-system';

/** Map a directive/proposal priority onto the spine's P# scale. */
function normalizePriority(raw: string | null | undefined): string {
  if (!raw) return 'P2';
  if (/^P\d+$/i.test(raw)) return raw.toUpperCase();
  switch (raw.toLowerCase()) {
    case 'high':
      return 'P1';
    case 'medium':
      return 'P2';
    case 'low':
      return 'P3';
    default:
      return 'P2';
  }
}

/**
 * Resolve the business a directive's work belongs to WITHOUT fabricating. The
 * directive→objective→task chain carries no project scope; the only pointer is
 * ceo_directives.target_project_id (a legacy text that may hold a slug or a
 * legacy projects.id). Returns null when it cannot be honestly resolved.
 */
async function resolveDirectiveProjectSlug(
  supa: SupabaseClient,
  targetProjectId: string | null,
): Promise<string | null> {
  if (!targetProjectId) return null;

  // (a) It is already a registered, enabled project_definitions.slug.
  const { data: bySlug } = await supa
    .from('project_definitions')
    .select('slug')
    .eq('slug', targetProjectId)
    .eq('enabled', true)
    .maybeSingle();
  if (bySlug?.slug) return bySlug.slug as string;

  // (b) It is a legacy projects.id → map to its slug, then confirm enabled.
  const { data: legacy } = await supa
    .from('projects')
    .select('slug')
    .eq('id', targetProjectId)
    .maybeSingle();
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

export interface EmittedWork {
  assignedWorkId: string;
  proposalId: string;
  ownerExecutiveId: string;
  title: string;
  priority: string;
}

export interface DirectiveSpineResult {
  directiveId: string;
  /** null ⇒ the directive has no resolvable business (surfaced, not fabricated). */
  projectSlug: string | null;
  unscoped: boolean;
  emitted: EmittedWork[];
  skippedExisting: number; // already on the spine (idempotent re-drain)
  consideredProposals: number;
}

/**
 * Emit assigned_work for every actionable (status='proposed') task_proposals row
 * of a directive that is not already on the spine. Safe to call after every
 * fan-out drain — idempotent. Does NOT approve anything (the ceo_decisions gate
 * does that). Returns a structured result for reporting.
 */
export async function emitDirectiveSpine(directiveId: string): Promise<DirectiveSpineResult> {
  const supa = getSupabaseAdmin();
  const { repos } = getPlatform();

  const directive = await getDirectiveById(directiveId);
  if (!directive) throw new Error(`Directive ${directiveId} not found`);

  const projectSlug = await resolveDirectiveProjectSlug(supa, directive.targetProjectId);

  const proposals = (await repos.taskProposals.listByDirective(directiveId)).filter(
    (p) => p.status === 'proposed',
  );

  const base: DirectiveSpineResult = {
    directiveId,
    projectSlug,
    unscoped: projectSlug === null,
    emitted: [],
    skippedExisting: 0,
    consideredProposals: proposals.length,
  };

  // Honest stop: without a resolvable business we cannot satisfy the NOT NULL
  // project_slug on the spine. Surface it; never invent a business.
  if (!projectSlug) return base;
  if (proposals.length === 0) return base;

  // Idempotency: a directive's existing spine rows keyed by owner::title.
  const { data: existing } = await supa
    .from('assigned_work')
    .select('owner_executive_id, title')
    .eq('source_type', 'directive')
    .eq('source_id', directiveId);
  const seen = new Set(
    (existing ?? []).map(
      (r: { owner_executive_id: string; title: string }) => `${r.owner_executive_id}::${r.title}`,
    ),
  );

  const directivePriority = normalizePriority(directive.priority);

  const toInsert = proposals
    .filter((p) => !seen.has(`${p.sourceExecutiveId}::${p.payload.title}`))
    .map((p) => ({
      proposalId: p.id,
      row: {
        project_slug: projectSlug,
        source_type: 'directive' as const,
        source_id: directiveId,
        owner_executive_id: p.sourceExecutiveId,
        title: p.payload.title,
        detail: p.payload.description ?? null,
        approval_status: 'proposed' as const,
        execution_status: 'open' as const,
        priority: directivePriority,
        // NO fabricated deadline (AC4). dateless ⇒ Needs CEO Completion.
        due_date: null,
        review_date: null,
        created_by: p.sourceExecutiveId,
      },
    }));

  base.skippedExisting = proposals.length - toInsert.length;
  if (toInsert.length === 0) return base;

  const { data: inserted, error } = await supa
    .from('assigned_work')
    .insert(toInsert.map((t) => t.row))
    .select('id');
  if (error) throw new Error(error.message);

  // PostgREST returns inserted rows in input order → line ids up with proposals.
  base.emitted = toInsert.map((t, i) => ({
    assignedWorkId: (inserted?.[i]?.id as string) ?? '',
    proposalId: t.proposalId,
    ownerExecutiveId: t.row.owner_executive_id,
    title: t.row.title,
    priority: t.row.priority,
  }));
  return base;
}
