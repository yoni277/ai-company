/**
 * OF-007 Phase 1 — Executive Context Pack: pure shapes + formatters.
 *
 * Mirrors instruction-shape.ts: NO `server-only` / DB imports, so the whole
 * thing lifts into `packages/executive-context` unchanged (Phase 4). The pack
 * injects FACTS (evidence-grade, spine-derived) and ASSUMPTIONS (challengeable)
 * as SEPARATE, distinctly-headed blocks (CA D082) so an assumption can never
 * harden into a pseudo-fact and silently kill disagreement.
 *
 * D068: business evidence is real or the EXACT string "No business evidence
 * available" — never synthetic/mock/connector data.
 *
 * Layer 1 (companyContext) sources ONLY business data (executive_memory +
 * objectives + project_definitions) — never any OS/OF/L/D/EPIC/tracker/
 * governance artifact (D082 boundary #1).
 */

import type { WorkState } from './work-state';

export type ContextPurpose = 'directive' | 'meeting' | 'instruction';

export const NO_BUSINESS_EVIDENCE = 'No business evidence available';

export interface BusinessEvidence {
  available: true;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
}
export interface NoBusinessEvidence {
  available: false;
}
export type EvidenceBlock = BusinessEvidence | NoBusinessEvidence;

export interface ContextObjective {
  id: string;
  title: string;
  status: string;
}
export interface ContextWorkItem {
  id: string;
  title: string;
  state: WorkState;
  ageDays: number;
  ownerExecutiveId: string | null;
  priority: string;
}
export interface ContextDecision {
  title: string;
  status: string;
}
export interface ContextRisk {
  description: string;
  severity: string;
}
export interface ContextAttentionItem {
  title: string;
  state: WorkState;
  ageDays: number;
}

export interface ContextWorkCounts {
  total: number;
  byState: Partial<Record<WorkState, number>>;
}

/** FACTS — evidence-grade, spine-derived reality. NEVER includes known_assumptions. */
export interface ContextFacts {
  objectives: ContextObjective[]; // ≤10
  workCounts: ContextWorkCounts;
  topWork: ContextWorkItem[]; // ≤8 by state-severity × ageDays
  recentDecisions: ContextDecision[]; // ≤8, title+status
  risks: ContextRisk[]; // ≤5 by severity
  evidence: EvidenceBlock; // real or { available:false }
  attention: ContextAttentionItem[]; // ≤5
}

export interface ContextPack {
  projectSlug: string;
  executiveId: string;
  purpose: ContextPurpose;
  assembledAt: string;
  companyContext: string; // Layer 1 — identity preamble (cacheable per project)
  operationalContext: string; // Layer 2 — task preamble
  facts: ContextFacts; // evidence-grade
  assumptions: string[]; // challengeable — from executive_memory.known_assumptions ONLY
}

/* ---- rendering helpers ---------------------------------------------------- */

/** Render a list with a hard cap and an explicit "(+N more)" tail. */
function cappedList(items: string[], cap: number): string {
  if (items.length === 0) return '  (none)';
  const shown = items.slice(0, cap).map((s) => `  - ${s}`);
  const extra = items.length - cap;
  if (extra > 0) shown.push(`  (+${extra} more)`);
  return shown.join('\n');
}

function ageLabel(ageDays: number): string {
  return `${ageDays}d`;
}

function assumptionsBlock(assumptions: string[]): string {
  return ['ASSUMPTIONS (challengeable — open hypotheses, NOT settled facts):', cappedList(assumptions, 10)].join('\n');
}

/**
 * Layer 1 — company/identity preamble. Business sources only. Renders FACTS
 * (business name, strategy, objectives) and ASSUMPTIONS (known_assumptions)
 * under distinct headings. known_assumptions NEVER appear under FACTS.
 */
export function companyContextString(input: {
  projectName: string | null;
  projectSlug: string;
  currentStrategy: string | null;
  objectives: ContextObjective[];
  assumptions: string[];
}): string {
  const name = input.projectName ?? input.projectSlug;
  const facts = [
    'FACTS:',
    `  - Business: ${name}`,
    `  - Current strategy: ${input.currentStrategy?.trim() || '(none recorded)'}`,
    '  - Current objectives:',
    input.objectives.length === 0
      ? '    (none)'
      : input.objectives
          .slice(0, 10)
          .map((o) => `    - ${o.title} [${o.status}]`)
          .join('\n') + (input.objectives.length > 10 ? `\n    (+${input.objectives.length - 10} more)` : ''),
  ].join('\n');
  return [`COMPANY CONTEXT — ${name}`, facts, assumptionsBlock(input.assumptions)].join('\n\n');
}

/**
 * Layer 2 — operational task preamble. Renders FACTS (work counts/states, top
 * work, recent decisions, risks, business evidence, attention) and ASSUMPTIONS
 * under distinct headings. `purpose` selects the emphasis (one assembler, no
 * forks). Decisions are framed "be aware", never as settling the question (D076).
 * Evidence absent → the exact string `No business evidence available`.
 */
export function operationalContextString(input: {
  purpose: ContextPurpose;
  executiveId: string;
  /** FULL ranked lists — the formatter is the single capping authority ("(+N more)"). */
  workCounts: ContextWorkCounts;
  topWork: ContextWorkItem[];
  recentDecisions: ContextDecision[];
  risks: ContextRisk[];
  evidence: EvidenceBlock;
  attention: ContextAttentionItem[];
  assumptions: string[];
}): string {
  const { purpose } = input;

  const lead: Record<ContextPurpose, string> = {
    directive: 'Focus: objectives, risks, business evidence, and what needs attention.',
    meeting: 'Focus: the full operational snapshot for the room.',
    instruction: `Focus: ${input.executiveId}'s own open / blocked / waiting work and the objective in scope.`,
  };

  const countSummary =
    Object.entries(input.workCounts.byState)
      .map(([s, n]) => `${s}:${n}`)
      .join(', ') || 'none';

  const evidenceLine = input.evidence.available
    ? `${input.evidence.summary}${
        input.evidence.metrics.length > 0
          ? ` — ${input.evidence.metrics.map((m) => `${m.label}: ${m.value}`).join(', ')}`
          : ''
      }`
    : NO_BUSINESS_EVIDENCE;

  const factsBlock = [
    'FACTS:',
    `Work: ${input.workCounts.total} item(s) — ${countSummary}.`,
    'Top work (by urgency):',
    cappedList(
      input.topWork.map((w) => `${w.title} [${w.state}, ${ageLabel(w.ageDays)}, ${w.priority}]`),
      8,
    ),
    'Recent decisions (be aware — do NOT treat as settling the current question):',
    cappedList(
      input.recentDecisions.map((d) => `${d.title} — ${d.status}`),
      8,
    ),
    'Risks:',
    cappedList(
      input.risks.map((r) => `[${r.severity}] ${r.description}`),
      5,
    ),
    `Business evidence: ${evidenceLine}`,
    'Needs attention:',
    cappedList(
      input.attention.map((a) => `${a.title} [${a.state}, ${ageLabel(a.ageDays)}]`),
      5,
    ),
  ].join('\n');

  return [`OPERATIONAL CONTEXT (${purpose})`, lead[purpose], factsBlock, assumptionsBlock(input.assumptions)].join(
    '\n\n',
  );
}
