import 'server-only';

/**
 * OF-007 Phase 2 — app-side wiring of the (pure) Context Pack assembler to
 * Supabase + the SHARED classifier. The assembler (context-pack.ts) stays pure
 * and DI'd; this module supplies the project_slug-scoped readers by reusing the
 * loader's read logic (loadWorkMasterList = the same classifier /work and the
 * Exec Desktop use — no second classification), and persists assembled packs.
 *
 * D068: readEvidence returns REAL business evidence or null (→ { available:false })
 * — never the mock connectors.
 */

import { getSupabaseAdmin } from '../doos/supabase-admin';
import { loadWorkMasterList } from './work-control';
import type { ContextPackDeps } from './context-pack';
import { normalizeAssumption, type ContextPack } from './context-pack-shape';

/** ContextPackDeps backed by the service-role client + the shared classifier. */
export function buildContextPackDeps(): ContextPackDeps {
  const supa = getSupabaseAdmin();
  return {
    async readWorkItems(executiveId, projectSlug) {
      // The SAME classifier/aging /work and /situation use — scoped to this owner.
      const items = await loadWorkMasterList({ ownerExecutiveId: executiveId, projectSlug });
      return items.map((w) => ({
        id: w.id,
        title: w.title,
        state: w.state,
        ageDays: w.ageDays,
        ownerExecutiveId: w.ownerExecutiveId,
        priority: w.priority,
      }));
    },
    async readObjectives(executiveId, _projectSlug) {
      const { data } = await supa
        .from('objectives')
        .select('id, title, status')
        .eq('owner_id', executiveId)
        .limit(25);
      return (data ?? []).map((o: { id: string; title: string; status: string }) => ({
        id: o.id,
        title: o.title,
        status: o.status,
      }));
    },
    async readRisks(executiveId, projectSlug) {
      // risks.project_id is a uuid → legacy projects(id); resolve slug→id to scope.
      const { data: legacy } = await supa.from('projects').select('id').eq('slug', projectSlug).maybeSingle();
      if (!legacy?.id) return [];
      const { data } = await supa
        .from('risks')
        .select('description, severity')
        .eq('recorded_by', executiveId)
        .eq('project_id', legacy.id)
        .limit(25);
      return (data ?? []).map((r: { description: string; severity: string }) => ({
        description: r.description,
        severity: r.severity,
      }));
    },
    async readDecisions(executiveId, projectSlug) {
      const { data } = await supa
        .from('ceo_decisions')
        .select('decision_title, decision_status, created_at')
        .eq('owner', executiveId)
        .eq('project_id', projectSlug)
        .order('created_at', { ascending: false })
        .limit(10);
      return (data ?? []).map((d: { decision_title: string; decision_status: string }) => ({
        title: d.decision_title,
        status: d.decision_status,
      }));
    },
    async readMemory(executiveId, projectSlug) {
      const { data } = await supa
        .from('executive_memory')
        .select('current_strategy, known_assumptions')
        .eq('executive_id', executiveId)
        .eq('project_slug', projectSlug)
        .maybeSingle();
      // known_assumptions rows may be plain strings OR { assumption, since }
      // objects. Take the assumption TEXT only and DROP `since` (provenance/
      // governance) so an "L30 meeting"-style tag can never reach executive
      // context (D082 boundary #1).
      const rawAssumptions = (data?.known_assumptions ?? []) as unknown[];
      return {
        currentStrategy: data?.current_strategy ?? null,
        knownAssumptions: rawAssumptions.map(normalizeAssumption).filter((a) => a.length > 0),
      };
    },
    async readBusiness(projectSlug) {
      const { data } = await supa
        .from('project_definitions')
        .select('name')
        .eq('slug', projectSlug)
        .maybeSingle();
      return { name: data?.name ?? null };
    },
    // D068 — no real business evidence source wired yet (WDIP pending). Honest null;
    // NEVER the mock portfolio-intelligence/revenue connectors.
    async readEvidence() {
      return null;
    },
    now() {
      return new Date().toISOString();
    },
  };
}

/** Persist an assembled pack for CEO inspectability (additive table; soft source_id). */
export async function persistContextPack(
  pack: ContextPack,
  sourceKind: 'instruction' | 'meeting' | 'directive',
  sourceId: string,
): Promise<void> {
  const supa = getSupabaseAdmin();
  const { error } = await supa.from('executive_context_packs').insert({
    project_slug: pack.projectSlug,
    executive_id: pack.executiveId,
    purpose: pack.purpose,
    assembled_at: pack.assembledAt,
    pack,
    source_kind: sourceKind,
    source_id: sourceId,
  });
  if (error) throw new Error(error.message);
}
