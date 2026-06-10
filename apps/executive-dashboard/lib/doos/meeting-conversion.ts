/**
 * OF-008 — Meeting → Work conversion guarantee (mirrors the L37 directive fix).
 *
 * Pure, no-IO (type-only imports → testable). A meeting must NEVER end in
 * agreement-without-work or a silent stall: R4 synthesis either yields ≥1 owned,
 * actionable decision (→ a proposed assigned_work) when there is any actionable
 * outcome, OR records an explicit, honest "no action needed — <reason>". This
 * module is the deterministic safety net behind the strengthened R4 prompt.
 *
 * Honest dissent (D076) is untouched — this only ensures the NEXT STEP is owned;
 * it never fabricates consensus (dissenting_opinions are preserved as-is).
 */

import type { SynthesisDecision, ExecutiveId } from './meeting-personas';

export interface ConversionOutcome {
  /** A fallback owned next-step was synthesized (synthesis failed to own one). */
  synthesizedFallback: boolean;
  /** The meeting genuinely needs no action — recorded, never silent. */
  noAction: { reason: string } | null;
}

/**
 * Guarantee an owned actionable decision or an explicit no-action. MUTATES
 * `decisions` (appends a single owned next-step when synthesis produced an
 * actionable intent it failed to own, or nothing at all). Returns what it did.
 */
export function ensureOwnedWorkOrNoAction(
  decisions: SynthesisDecision[],
  summary: string,
  moderator: ExecutiveId,
  topic: string,
): ConversionOutcome {
  const owned = decisions.filter((d) => d.actionable && d.owner_executive_id);
  if (owned.length > 0) return { synthesizedFallback: false, noAction: null };

  const actionableNoOwner = decisions.find((d) => d.actionable && !d.owner_executive_id);
  const anyActionable = decisions.some((d) => d.actionable);

  // Genuine no-action: decisions exist and none are actionable. Honest, recorded.
  if (decisions.length > 0 && !anyActionable) {
    const reason = (decisions[0]?.rationale || summary || 'The room concluded no action is required.').trim();
    return { synthesizedFallback: false, noAction: { reason } };
  }

  // Structuring failure (actionable but unowned) or degenerate (no decisions):
  // synthesize ONE owned next step so the meeting reaches the spine. The Chief of
  // Staff owns it pending CEO approval. No fabricated deadline (CEO sets it).
  const src = actionableNoOwner ?? decisions[0] ?? null;
  decisions.push({
    decision: src?.decision || `Operationalize the outcome of: ${topic}`,
    rationale:
      'Auto-synthesized owned next step — the synthesis reached an actionable outcome without naming an owner. The Chief of Staff owns it pending CEO approval (mirrors the directive→work conversion guarantee).',
    dissenting_opinions: src?.dissenting_opinions ?? [],
    actionable: true,
    owner_executive_id: moderator,
    work_title: src?.work_title || src?.decision || `Next step: ${topic}`,
    work_detail: src?.work_detail || src?.rationale || summary || topic,
    due_in_days: null,
  });
  return { synthesizedFallback: true, noAction: null };
}
