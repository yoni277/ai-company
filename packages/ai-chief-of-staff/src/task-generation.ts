import { createHash } from 'node:crypto';
import type {
  CEODirective,
  EvidenceRequirementSchema,
  ProposalType,
  TaskProposal,
  TaskProposalRecord,
} from '@ai-company/shared-types';
import type { Repositories } from '@ai-company/database';

/**
 * P005A — Directive → TaskProposal layer (governance-correct path).
 *
 * Approved by Chief Architect 2026-06-04. Replaces the direct-task-creation
 * path that shipped in P005 with a proposal layer:
 *
 *   Directive → ExecutiveReport → TaskProposal → CEO Decision → Task
 *
 * This module owns the cognitive → persisted-proposal hop only. The
 * promotion-to-Task step is owned by the dashboard route handler so the
 * decision event is a single audit record.
 *
 * Decisions locked (all approved):
 *   A. Cap per directive = 3 — forces executive prioritization. Excess
 *      proposals are dropped with a warning. Beyond-3 is a Phase 4+ feature
 *      and would split across multiple directives, not relax this cap.
 *   B. Missing objective → skip entire fan-out (write warning).
 *      SUPERSEDED for the SPINE path by OF-011 / D085 / D084 (2026-06-10): the
 *      assigned_work spine requires project_slug, NOT an objective (the OF-008
 *      meeting path already converges with no objective). So directive
 *      responders now PERSIST proposals even when objectiveId is null — they
 *      converge to the spine for governance + visibility. The lock survives only
 *      where it belongs: the promote-to-task path keeps its 422 objective-guard,
 *      so an objective is still required before work becomes an executable task.
 *      `requireObjective` (default true) preserves decision B for any legacy
 *      caller that has not opted in.
 *   C. Idempotency = fingerprint dedup. Rerun of the same directive emits
 *      identical proposals; upsert bumps `generation` instead of inserting
 *      a duplicate row. Fingerprint = hash(directive_id, source_executive_id,
 *      proposal_type, normalize(title), capabilityRequired).
 *   D. Status = 'proposed' always. Status transitions happen via the
 *      promote/reject endpoints, never here.
 *   E. proposal_type defaults to 'action' when the cognitive layer omits it
 *      so legacy outputs still work.
 *
 * What this module does NOT do:
 *   - Create rows in ai_company.tasks (the promotion endpoint does).
 *   - Branch on executive id (the caller passes sourceExecutiveId; we treat
 *     it as opaque data per the Platform Separation Axiom).
 */

export const TASK_PROPOSAL_CAP_PER_DIRECTIVE = 3;

export const DEFAULT_EVIDENCE_REQUIRED: EvidenceRequirementSchema = {
  minTier: 'E2',
  requiredKinds: [],
  minCount: 1,
};

export const DEFAULT_PROPOSAL_TYPE: ProposalType = 'action';

export type TransformOutcome =
  | {
      kind: 'persisted';
      proposals: TaskProposalRecord[];
      warnings: string[];
      synthesized: boolean;
      /**
       * OF-011 / D085 — true when the directive carried no objective. Proposals
       * still persist and converge to the spine (governance + visibility), but
       * cannot be promoted to an executable task until the CEO assigns an
       * objective (the promote-to-task path keeps its 422 guard). A soft signal,
       * never a block on persistence.
       */
      needsObjective: boolean;
    }
  | { kind: 'skipped-no-objective'; warnings: string[] }
  | { kind: 'skipped-no-proposals'; warnings: string[] };

export interface TransformInput {
  directive: CEODirective;
  sourceExecutiveId: string;
  proposals: readonly TaskProposal[] | undefined;
  /**
   * EPIC-004A safety net. When true and the directive has an objective but the
   * executive returned NO usable structured proposals, synthesize exactly one
   * fallback proposal from the directive so a directive ALWAYS reaches the work
   * spine (≥1 assigned_work) instead of silently vanishing. The fallback is
   * clearly labelled for CEO breakdown and carries NO invented deadline. The
   * no-objective governance lock (decision B) is preserved regardless.
   */
  synthesizeFallback?: boolean;
}

/**
 * Deterministic fallback proposal derived from a directive. Honest: it restates
 * the CEO's own directive as one actionable item the responding executive owns,
 * flags that the structured fan-out was missing, and invents no deadline. Always
 * passes validateProposal (title + capabilityRequired present).
 */
export function synthesizeDirectiveProposal(directive: CEODirective): TaskProposal {
  const title = (directive.title?.trim() || 'Break CEO directive into concrete work').slice(0, 80);
  const body = directive.directive?.trim() ?? '';
  const description =
    `Fallback task — the responding executive returned no structured proposals, so the ` +
    `platform synthesized this so the directive is tracked. Break it into concrete work. ` +
    `Directive: ${body}`.slice(0, 480);
  return {
    title,
    capabilityRequired: 'plan_directive_response',
    description,
    proposalType: 'action',
    // No priority / dueInDays — deadlines are CEO-set, never fabricated (AC4).
  };
}

/**
 * Pure validator + planner. Decides which proposals would be persisted
 * without touching any repository. Exported for table-driven tests.
 */
export function planProposals(input: {
  proposals: readonly TaskProposal[] | undefined;
  objectiveId: string | null;
  /**
   * OF-011 / D085 — when false, a null objective no longer skips the fan-out;
   * proposals are planned and persisted so they converge to the spine (which
   * needs project_slug, not an objective). Defaults to true to preserve the
   * CA-2026-06-04 lock (decision B) for the legacy promote-to-task path.
   */
  requireObjective?: boolean;
}): {
  accepted: TaskProposal[];
  rejected: Array<{ proposal: unknown; reason: string }>;
  skipReason: 'no-objective' | 'no-proposals' | null;
} {
  const requireObjective = input.requireObjective ?? true;
  if (requireObjective && !input.objectiveId) {
    return { accepted: [], rejected: [], skipReason: 'no-objective' };
  }
  const list = Array.isArray(input.proposals) ? input.proposals : [];
  if (list.length === 0) {
    return { accepted: [], rejected: [], skipReason: 'no-proposals' };
  }

  const accepted: TaskProposal[] = [];
  const rejected: Array<{ proposal: unknown; reason: string }> = [];

  for (const p of list) {
    if (accepted.length >= TASK_PROPOSAL_CAP_PER_DIRECTIVE) {
      rejected.push({ proposal: p, reason: 'cap-exceeded' });
      continue;
    }
    const validation = validateProposal(p);
    if (!validation.ok) {
      rejected.push({ proposal: p, reason: validation.reason });
      continue;
    }
    accepted.push(validation.proposal);
  }

  return { accepted, rejected, skipReason: null };
}

interface ValidationOk {
  ok: true;
  proposal: TaskProposal;
}
interface ValidationFail {
  ok: false;
  reason: string;
}

function validateProposal(raw: unknown): ValidationOk | ValidationFail {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, reason: 'not-an-object' };
  }
  const p = raw as Record<string, unknown>;
  if (typeof p.title !== 'string' || p.title.trim().length === 0) {
    return { ok: false, reason: 'missing-title' };
  }
  if (
    typeof p.capabilityRequired !== 'string' ||
    p.capabilityRequired.trim().length === 0
  ) {
    return { ok: false, reason: 'missing-capability-required' };
  }
  if (
    p.dueInDays !== undefined &&
    (typeof p.dueInDays !== 'number' || !Number.isFinite(p.dueInDays) || p.dueInDays < 0)
  ) {
    return { ok: false, reason: 'invalid-dueInDays' };
  }
  if (
    p.priority !== undefined &&
    p.priority !== 'low' &&
    p.priority !== 'medium' &&
    p.priority !== 'high'
  ) {
    return { ok: false, reason: 'invalid-priority' };
  }
  if (
    p.proposalType !== undefined &&
    p.proposalType !== 'action' &&
    p.proposalType !== 'research' &&
    p.proposalType !== 'decision' &&
    p.proposalType !== 'escalation'
  ) {
    return { ok: false, reason: 'invalid-proposal-type' };
  }
  const proposal: TaskProposal = {
    title: p.title.trim(),
    capabilityRequired: p.capabilityRequired.trim(),
  };
  if (typeof p.description === 'string') proposal.description = p.description;
  if (
    p.proposalType === 'action' ||
    p.proposalType === 'research' ||
    p.proposalType === 'decision' ||
    p.proposalType === 'escalation'
  ) {
    proposal.proposalType = p.proposalType;
  }
  if (p.priority === 'low' || p.priority === 'medium' || p.priority === 'high') {
    proposal.priority = p.priority;
  }
  if (typeof p.dueInDays === 'number') proposal.dueInDays = p.dueInDays;
  if (p.evidenceRequired) {
    proposal.evidenceRequired = p.evidenceRequired as EvidenceRequirementSchema;
  }
  return { ok: true, proposal };
}

/**
 * Fingerprint for proposal-level dedup. Hash inputs match the doctrine
 * lock: directive_id + source_executive_id + proposal_type + normalized
 * title + capability_required. Stable across reruns of an identical
 * proposal so the unique index on (directive_id, fingerprint) collapses
 * duplicates and the upsert bumps `generation`.
 *
 * Exported so tests can assert two semantically-equal proposals hash to
 * the same value.
 */
export function fingerprintProposal(input: {
  directiveId: string;
  sourceExecutiveId: string;
  proposalType: ProposalType;
  title: string;
  capabilityRequired: string;
}): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const payload = [
    input.directiveId,
    input.sourceExecutiveId,
    input.proposalType,
    norm(input.title),
    norm(input.capabilityRequired),
  ].join(' ');
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Persist proposals into ai_company.task_proposals. Returns a `persisted`
 * outcome listing the actual TaskProposalRecord rows (whether newly
 * inserted or generation-bumped). Never throws when there is nothing to
 * persist — returns a `skipped-no-proposals` outcome instead so the responder
 * can still return its report id.
 *
 * OF-011 / D085: a null objective no longer skips persistence — proposals
 * converge to the spine regardless, with `needsObjective: true` on the outcome
 * as a soft governance signal. (The legacy `skipped-no-objective` outcome is
 * retained in the union for the objective-required path but is not produced
 * here.)
 */
export async function transformProposalsToProposals(
  repos: Repositories,
  input: TransformInput,
): Promise<TransformOutcome> {
  // OF-011 / D085 — the spine path is objective-OPTIONAL. Plan (and below,
  // persist) proposals even when the directive has no objective; they converge
  // to assigned_work for governance + visibility. Execution stays objective-
  // gated downstream (the promote-to-task path keeps its 422 guard).
  const needsObjective = !input.directive.objectiveId;
  const plan = planProposals({
    proposals: input.proposals,
    objectiveId: input.directive.objectiveId ?? null,
    requireObjective: false,
  });

  const warnings = plan.rejected.map(
    (r) => `dropped proposal from ${input.sourceExecutiveId}: ${r.reason}`,
  );

  if (needsObjective) {
    // Soft signal (D085 item 3): visible, never a block. The CEO assigns an
    // objective before this proposed work can be promoted to an executable task.
    warnings.push(
      `directive ${input.directive.id} has no objective_id; proposals from ${input.sourceExecutiveId} persist to the spine for review but need an objective before promotion to a task`,
    );
  }

  // The executive produced no usable structured proposals (empty, absent, or
  // all-malformed). Either synthesize a fallback (EPIC-004A: a directive must
  // reach the spine) or surface the zero case.
  let accepted = plan.accepted;
  let synthesized = false;
  if (accepted.length === 0) {
    if (input.synthesizeFallback) {
      accepted = [synthesizeDirectiveProposal(input.directive)];
      synthesized = true;
      warnings.push(
        `no structured proposals from ${input.sourceExecutiveId} for directive ${input.directive.id}; synthesized 1 fallback for CEO breakdown`,
      );
    } else {
      return { kind: 'skipped-no-proposals', warnings };
    }
  }

  const persisted: TaskProposalRecord[] = [];
  for (const p of accepted) {
    const proposalType: ProposalType = p.proposalType ?? DEFAULT_PROPOSAL_TYPE;
    const fingerprint = fingerprintProposal({
      directiveId: input.directive.id,
      sourceExecutiveId: input.sourceExecutiveId,
      proposalType,
      title: p.title,
      capabilityRequired: p.capabilityRequired,
    });
    const record = await repos.taskProposals.upsert({
      directiveId: input.directive.id,
      sourceExecutiveId: input.sourceExecutiveId,
      proposalType,
      fingerprint,
      payload: p,
    });
    persisted.push(record);
  }

  return { kind: 'persisted', proposals: persisted, warnings, synthesized, needsObjective };
}
