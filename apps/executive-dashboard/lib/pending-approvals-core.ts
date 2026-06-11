/**
 * D8 / P0-1 — Structured approval detection (PURE core).
 *
 * The pending-approval set is derived from STRUCTURED records only — never from
 * free-text parsing of LLM-authored risk/opportunity descriptions. This is the
 * "LLMs Explain, Algorithms Decide" / Deterministic-Metrics doctrine: an
 * approval is a record with an explicit status, not a phrase a model happened
 * to write.
 *
 * The three authoritative sources (CA-approved, D090):
 *   1. ceo_decisions       — open (decision_status = 'proposed')
 *   2. task_proposals      — status = 'proposed'
 *   3. assigned_work       — approval_status = 'proposed'
 *      (the structured precedent at executive-os/executives.ts:274 —
 *       needs_ceo_completion + awaiting_approval — which are exactly the
 *       proposed assigned_work states.)
 *
 * Pure: no IO, no 'server-only'. The thin reader (phase2-metrics.ts) fetches
 * the rows and calls derivePendingApprovals(). Filtering to the approved-pending
 * status lives HERE so the rule is a single auditable place, unit-tested.
 *
 * Cloneable: zero business specifics, generic entities.
 */

/** The pending-approval status tokens, by source. Explicit + auditable. */
export const OPEN_DECISION_STATUS = 'proposed';
export const PROPOSED_PROPOSAL_STATUS = 'proposed';
export const PROPOSED_WORK_APPROVAL_STATUS = 'proposed';

export interface DecisionRecord {
  id: string;
  title: string;
  status: string; // ceo_decisions.decision_status
  projectKey?: string | null; // project id or slug, for display only
}
export interface ProposalRecord {
  id: string;
  title: string;
  status: string; // task_proposals.status
}
export interface WorkRecord {
  id: string;
  title: string;
  approvalStatus: string; // assigned_work.approval_status
  sourceType: string; // directive | meeting | instruction
  projectKey?: string | null; // project slug, for display only
}

export interface PendingApprovalItem {
  id: string;
  label: string;
  /** Structured origin token — auditable (never an LLM free-text source). */
  source: 'ceo_decision' | `task_proposal` | `assigned_work:${string}`;
  projectName?: string;
}

export interface DerivePendingApprovalsInput {
  decisions: readonly DecisionRecord[];
  proposals: readonly ProposalRecord[];
  work: readonly WorkRecord[];
  /** Optional display-name resolver (id or slug → name). Display only. */
  projectName?: (key: string | null | undefined) => string | undefined;
}

/**
 * Derive the pending-approval list from the three structured sources. Each
 * source is filtered to its explicit "awaiting CEO" status — nothing here reads
 * a description or matches a pattern. Deterministic and order-stable
 * (decisions → proposals → work).
 */
export function derivePendingApprovals(input: DerivePendingApprovalsInput): PendingApprovalItem[] {
  const resolve = input.projectName ?? (() => undefined);
  const items: PendingApprovalItem[] = [];

  for (const d of input.decisions) {
    if (d.status !== OPEN_DECISION_STATUS) continue;
    const name = resolve(d.projectKey);
    items.push({
      id: d.id,
      label: d.title,
      source: 'ceo_decision',
      ...(name !== undefined ? { projectName: name } : {}),
    });
  }

  for (const p of input.proposals) {
    if (p.status !== PROPOSED_PROPOSAL_STATUS) continue;
    items.push({ id: p.id, label: p.title, source: 'task_proposal' });
  }

  for (const w of input.work) {
    if (w.approvalStatus !== PROPOSED_WORK_APPROVAL_STATUS) continue;
    const name = resolve(w.projectKey);
    items.push({
      id: w.id,
      label: w.title,
      source: `assigned_work:${w.sourceType}`,
      ...(name !== undefined ? { projectName: name } : {}),
    });
  }

  return items;
}

/** Count convenience — the deterministic pending-approval count. */
export function countPendingApprovals(input: DerivePendingApprovalsInput): number {
  return derivePendingApprovals(input).length;
}
