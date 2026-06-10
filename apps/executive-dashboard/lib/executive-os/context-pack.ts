/**
 * OF-007 Phase 1 — Executive Context Pack assembler (generic, DI'd, flag-gated).
 *
 * `assembleExecutiveContext(deps, { executiveId, projectSlug, purpose })` shapes
 * the existing scoped reads + the shared classifier into a bounded ContextPack:
 * FACTS (evidence-grade, spine-derived) + ASSUMPTIONS (challengeable, from
 * executive_memory.known_assumptions ONLY). Pure assembly behind dependency-
 * injected readers, so Phase 4 lifts it into `packages/executive-context`
 * unchanged. NO new LLM call (the pack is context, not inference). NO DB import
 * here — the app provides the readers.
 *
 * Caps (window safety): objectives ≤10 · top 8 work by state-severity × ageDays ·
 * risks ≤5 · decisions ≤8 · attention ≤5. D068: evidence is real or
 * { available:false }. Layer 1 sources only business data (D082 boundary #1).
 */

import { ATTENTION_STATES } from './work-state';
import type { WorkState } from './work-state';
import {
  companyContextString,
  operationalContextString,
  type BusinessEvidence,
  type ContextAttentionItem,
  type ContextDecision,
  type ContextFacts,
  type ContextObjective,
  type ContextPack,
  type ContextPurpose,
  type ContextRisk,
  type ContextWorkCounts,
  type ContextWorkItem,
  type EvidenceBlock,
} from './context-pack-shape';

/** Scoped readers + classifier output, injected so the assembler stays pure/cloneable. */
export interface ContextPackDeps {
  /** Work items already classified by the SHARED classifier (state + ageDays). */
  readWorkItems(executiveId: string, projectSlug: string): Promise<ContextWorkItem[]>;
  readObjectives(executiveId: string, projectSlug: string): Promise<ContextObjective[]>;
  readRisks(executiveId: string, projectSlug: string): Promise<ContextRisk[]>;
  /** Recent decisions, newest first (title + status only). */
  readDecisions(executiveId: string, projectSlug: string): Promise<ContextDecision[]>;
  readMemory(
    executiveId: string,
    projectSlug: string,
  ): Promise<{ currentStrategy: string | null; knownAssumptions: string[] }>;
  readBusiness(projectSlug: string): Promise<{ name: string | null }>;
  /** D068: real business evidence or null (→ { available:false }). Optional; absent ⇒ unavailable. */
  readEvidence?(projectSlug: string): Promise<BusinessEvidence | null>;
  now(): string;
}

export interface AssembleInput {
  executiveId: string;
  projectSlug: string;
  purpose: ContextPurpose;
}

export interface AssembleResult {
  companyContext: string;
  operationalContext: string;
  pack: ContextPack;
}

const STATE_SEVERITY: Record<WorkState, number> = {
  blocked: 5,
  overdue: 5,
  needs_ceo_completion: 4,
  awaiting_ceo_input: 4,
  awaiting_approval: 3,
  in_progress: 2,
  open: 1,
  done: 0,
  cancelled: 0,
  rejected: 0,
};
const TERMINAL_STATES: readonly WorkState[] = ['done', 'cancelled', 'rejected'];

/** Urgency rank = state-severity × ageDays; ties broken by severity then age so
 * fresh (age 0) high-severity work still sorts first instead of collapsing to 0. */
function byUrgency(a: ContextWorkItem, b: ContextWorkItem): number {
  const ra = STATE_SEVERITY[a.state] * a.ageDays;
  const rb = STATE_SEVERITY[b.state] * b.ageDays;
  if (rb !== ra) return rb - ra;
  if (STATE_SEVERITY[b.state] !== STATE_SEVERITY[a.state]) return STATE_SEVERITY[b.state] - STATE_SEVERITY[a.state];
  return b.ageDays - a.ageDays;
}

function severityWeight(s: string): number {
  switch (s.trim().toLowerCase()) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

export async function assembleExecutiveContext(
  deps: ContextPackDeps,
  input: AssembleInput,
): Promise<AssembleResult> {
  const { executiveId, projectSlug, purpose } = input;

  const [workItems, objectives, risks, decisions, memory, business, evidenceRaw] = await Promise.all([
    deps.readWorkItems(executiveId, projectSlug),
    deps.readObjectives(executiveId, projectSlug),
    deps.readRisks(executiveId, projectSlug),
    deps.readDecisions(executiveId, projectSlug),
    deps.readMemory(executiveId, projectSlug),
    deps.readBusiness(projectSlug),
    deps.readEvidence ? deps.readEvidence(projectSlug) : Promise.resolve(null),
  ]);

  // Work counts (always) — over the full classified set.
  const byState: Partial<Record<WorkState, number>> = {};
  for (const w of workItems) byState[w.state] = (byState[w.state] ?? 0) + 1;
  const workCounts: ContextWorkCounts = { total: workItems.length, byState };

  // FULL ranked lists — the formatter is the single capping authority (so it can
  // render an explicit "(+N more)"); the pack stores the capped slices.
  const topWorkRanked = workItems
    .filter((w) => !TERMINAL_STATES.includes(w.state))
    .slice()
    .sort(byUrgency);

  const attentionSet = new Set<WorkState>(ATTENTION_STATES);
  const attentionRanked: ContextAttentionItem[] = workItems
    .filter((w) => attentionSet.has(w.state))
    .slice()
    .sort(byUrgency)
    .map((w) => ({ title: w.title, state: w.state, ageDays: w.ageDays }));

  const risksRanked = risks.slice().sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));

  // D068 — real evidence or honest unavailable. Never synthesize.
  const evidence: EvidenceBlock = evidenceRaw ?? { available: false };

  const facts: ContextFacts = {
    objectives: objectives.slice(0, 10),
    workCounts,
    topWork: topWorkRanked.slice(0, 8),
    recentDecisions: decisions.slice(0, 8),
    risks: risksRanked.slice(0, 5),
    evidence,
    attention: attentionRanked.slice(0, 5),
  };

  // ASSUMPTIONS — from known_assumptions ONLY; coerced to strings, never into FACTS.
  const assumptions = (memory.knownAssumptions ?? [])
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
    .filter((a) => a.trim().length > 0);

  // Pass FULL ranked lists to the formatters so they can show "(+N more)";
  // pack.facts holds the capped slices.
  const companyContext = companyContextString({
    projectName: business.name,
    projectSlug,
    currentStrategy: memory.currentStrategy,
    objectives, // full — formatter caps to 10 + "(+N more)"
    assumptions,
  });
  const operationalContext = operationalContextString({
    purpose,
    executiveId,
    workCounts,
    topWork: topWorkRanked,
    recentDecisions: decisions,
    risks: risksRanked,
    evidence,
    attention: attentionRanked,
    assumptions,
  });

  const pack: ContextPack = {
    projectSlug,
    executiveId,
    purpose,
    assembledAt: deps.now(),
    companyContext,
    operationalContext,
    facts,
    assumptions,
  };

  return { companyContext, operationalContext, pack };
}

/**
 * OF-007 feature flag — env-gated, default OFF, per-`purpose` capable. Phase 1
 * only DEFINES it; consumers honour it in Phases 2–3. Accepts an injected env so
 * it stays testable/pure.
 *   CONTEXT_PACK_ENABLED = "" | "false" | "0" | "off" → off (default)
 *                        = "true" | "1" | "on" | "all"  → on for every purpose
 *                        = "instruction,meeting"        → on only for those purposes
 */
export function isContextPackEnabled(
  purpose?: ContextPurpose,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = (env.CONTEXT_PACK_ENABLED ?? '').trim().toLowerCase();
  if (!raw || raw === 'false' || raw === '0' || raw === 'off') return false;
  if (raw === 'true' || raw === '1' || raw === 'on' || raw === 'all') return true;
  if (!purpose) return false;
  return raw.split(',').map((s) => s.trim()).includes(purpose);
}
