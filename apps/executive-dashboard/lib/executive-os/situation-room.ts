import 'server-only';

/**
 * EPIC-004 Phase 5 — CEO Situation Room (D079, D068/D058).
 *
 * The one-screen, five-question SUMMARY over the SAME converged spine WCC
 * manages. Read-only: composes the EPIC-004A selectors (loadCeoAttentionQueue,
 * loadWorkMasterList) into the five panels. Introduces NO mutations and NO new
 * data model.
 *
 * D068 non-negotiable — the "winning" panel is evidence-gated: it reads ONLY
 * real spine outcomes (completed work, approved decisions) and reports
 * `businessEvidence: null` ("No business evidence wired yet") for true business
 * KPIs. It NEVER reads the mock portfolio-intelligence/revenue connectors and
 * NEVER presents platform progress as a business win.
 *
 * Cloneable: project_slug-scoped, zero business specifics.
 */

import { getSupabaseAdmin } from '../doos/supabase-admin';
import {
  loadCeoAttentionQueue,
  loadWorkMasterList,
  type AttentionItem,
  type WorkListItem,
} from './work-control';
import type { WorkState } from './work-state';

export interface WorkByExecutive {
  executiveId: string;
  inProgress: number;
  open: number;
  total: number;
}

export interface SituationRoom {
  projectSlug: string | null;
  asOf: string; // ISO — read-on-load, live each visit (no snapshot)
  /** 1 — What needs my attention? (the SAME queue as /work; same selector). */
  attention: {
    total: number;
    byState: Partial<Record<WorkState, number>>;
    top: AttentionItem[];
  };
  /** 2 — What are my people working on? (active work grouped by owner). */
  workByExecutive: WorkByExecutive[];
  /** 3 — What is blocked? (oldest-stuck first, by days-in-current-state). */
  blocked: {
    total: number;
    items: WorkListItem[];
  };
  /** 4 — What is winning? EVIDENCE-GATED (D068). */
  winning: {
    /** null ⇒ "No business evidence wired yet" — no real business KPIs until WDIP. */
    businessEvidence: null;
    /** Real spine outcomes only — honest progress, NOT dressed as business KPIs. */
    spineOutcomes: {
      completedWork: number;
      completedItems: WorkListItem[];
      approvedDecisions: number;
    };
  };
  /** 5 — What decision do I need to make? (proposed work in the approval gate). */
  decisions: {
    total: number;
    items: WorkListItem[];
  };
}

const TOP_N = 5;
const DECISION_STATES: readonly WorkState[] = ['needs_ceo_completion', 'awaiting_approval'];

export async function loadSituationRoom(projectSlug?: string): Promise<SituationRoom> {
  // Reuse the EXACT /work selectors — attention panel must match WCC's queue.
  const [attentionItems, work, approvedDecisions] = await Promise.all([
    loadCeoAttentionQueue(projectSlug),
    loadWorkMasterList(projectSlug ? { projectSlug } : {}),
    countApprovedDecisions(projectSlug),
  ]);

  // 1 — attention: counts by state + the top few (already priority/age-sorted).
  const byState: Partial<Record<WorkState, number>> = {};
  for (const a of attentionItems) byState[a.state] = (byState[a.state] ?? 0) + 1;

  // 2 — work by executive: active = approved & open/in_progress.
  const execMap = new Map<string, WorkByExecutive>();
  for (const w of work) {
    if (w.state !== 'in_progress' && w.state !== 'open') continue;
    const id = w.ownerExecutiveId ?? 'unassigned';
    const row = execMap.get(id) ?? { executiveId: id, inProgress: 0, open: 0, total: 0 };
    if (w.state === 'in_progress') row.inProgress += 1;
    else row.open += 1;
    row.total += 1;
    execMap.set(id, row);
  }
  const workByExecutive = [...execMap.values()].sort((a, b) => b.total - a.total);

  // 3 — blocked, oldest-stuck first.
  const blockedItems = work
    .filter((w) => w.state === 'blocked')
    .sort((a, b) => b.daysInCurrentState - a.daysInCurrentState);

  // 4 — winning: real spine outcomes only. businessEvidence stays null (D068).
  const completed = work.filter((w) => w.state === 'done');

  // 5 — decisions: proposed work in the approval gate.
  const decisionItems = work.filter((w) => DECISION_STATES.includes(w.state));

  return {
    projectSlug: projectSlug ?? null,
    asOf: new Date().toISOString(),
    attention: {
      total: attentionItems.length,
      byState,
      top: attentionItems.slice(0, TOP_N),
    },
    workByExecutive,
    blocked: {
      total: blockedItems.length,
      items: blockedItems.slice(0, TOP_N),
    },
    winning: {
      businessEvidence: null,
      spineOutcomes: {
        completedWork: completed.length,
        completedItems: completed.slice(0, TOP_N),
        approvedDecisions,
      },
    },
    decisions: {
      total: decisionItems.length,
      items: decisionItems.slice(0, TOP_N),
    },
  };
}

/** Approved CEO decisions (project-scoped when a slug is given). Real outcome, not a KPI. */
async function countApprovedDecisions(projectSlug?: string): Promise<number> {
  const supa = getSupabaseAdmin();
  let q = supa
    .from('ceo_decisions')
    .select('id', { count: 'exact', head: true })
    .in('decision_status', ['approved', 'completed']);
  if (projectSlug) q = q.eq('project_id', projectSlug);
  const { count } = await q;
  return count ?? 0;
}
