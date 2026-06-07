/**
 * DOOS — Deterministic Organizational Operating System (Phase 1A types).
 *
 * Doctrine reminder: these types describe the platform-side data model. Any
 * vendor-specific field (Stripe customer id, Slack channel, etc.) MUST NOT
 * land here. The cognitive layer references only the capability name on a
 * task; the instance layer maps that name to a concrete vendor call.
 */

export type ObjectiveStatus =
  | 'draft'
  | 'active'
  | 'at_risk'
  | 'blocked'
  | 'completed'
  | 'archived';

/**
 * ObjectiveHealth is DERIVED, not stored. Computed by
 * `computeObjectiveHealth()` in @ai-company/doos-core from outcomes + tasks.
 * Persisting it would create drift between actual and reported health.
 */
export type ObjectiveHealth = 'healthy' | 'at_risk' | 'critical';

export type OutcomeStatus = 'pending' | 'in_progress' | 'achieved' | 'failed';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'blocked'
  | 'awaiting_evidence'
  | 'completed'
  | 'cancelled';

export type EvidenceTier = 'E0' | 'E1' | 'E2' | 'E3' | 'E4';

/**
 * How an outcome's `currentValue` is updated. Phase 1 only writes 'manual';
 * the remaining values are forward-compatible slots so deterministic engines
 * can plug in later without a migration.
 */
export type OutcomeMeasurementSource =
  | 'manual'
  | 'sql_engine'
  | 'financial_engine'
  | 'custom_engine';

export interface Objective {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string | null;
  ownerId: string | null;
  status: ObjectiveStatus;
  targetOutcomeSummary: string | null;
}

export interface ObjectiveOutcome {
  id: string;
  objectiveId: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  metricUnit: string | null;
  baselineValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
  measurementSource: OutcomeMeasurementSource;
  status: OutcomeStatus;
  lastMeasuredAt: string | null;
}

/**
 * The JSON shape stored in `tasks.evidence_required`. Drives the
 * deterministic validator in @ai-company/doos-core.
 *
 * - `minTier`: lowest acceptable evidence tier (E0 weakest, E4 strongest).
 * - `requiredKinds`: every listed kind must appear at least once across
 *   the task's tokens. Empty array = any kind accepted.
 * - `minCount`: minimum number of tokens that satisfy the requirement.
 */
export interface EvidenceRequirementSchema {
  minTier: EvidenceTier;
  requiredKinds: string[];
  minCount: number;
}

export interface Task {
  id: string;
  createdAt: string;
  updatedAt: string;
  objectiveId: string;
  directiveId: string | null;
  title: string;
  description: string | null;
  capabilityRequired: string;
  ownerId: string | null;
  status: TaskStatus;
  evidenceRequired: EvidenceRequirementSchema;
  dueAt: string | null;
  completedAt: string | null;
  completedBy: string | null;
  /**
   * P005A — Link back to the TaskProposal that produced this task. Null on
   * legacy rows created before P005A (do not backfill — per Chief Architect
   * the null itself is audit information). To find the executive that
   * proposed a task, JOIN through this id; never denormalize.
   */
  proposalId: string | null;
}

/**
 * P007 — Evidence Engine.
 *
 * Source of an evidence record. The kind itself is factual; the source is
 * who/what put the record into the system. Doctrine: every record carries
 * provenance — there is no anonymous evidence.
 */
export type EvidenceSourceKind =
  | 'manual'         // operator attached via UI or API
  | 'connector_sync' // a connector's sync run produced this (reserved — P007A)
  | 'http_callback'  // external system POSTed evidence (reserved)
  | 'cli';           // CLI tool attached it

/**
 * P007 — Factual evidence categories. Each kind locks its tier (no operator
 * override; Chief Architect 2026-06-05). Payload validation per kind enforced
 * in @ai-company/doos-core.
 *
 *   manual_note         → E0   text + author; weakest tier by definition
 *   screenshot          → E2   url + capturedAt
 *   meeting_held        → E2   attendees + durationMinutes + heldAt
 *   document_produced   → E2   title + url + producedAt
 *   message_sent        → E3   channel + recipient + sentAt
 *   metric_snapshot     → E4   metricName + value + observedAt + source
 *   human_attestation   → E1   the override path: requires overrideReason
 *                              and approvedBy. Replaces the old "E1 tier"
 *                              concept with a kind-driven shape.
 *   other               → E0   classification debt. Requires `description`
 *                              and `proposedKind` so the operator names what
 *                              the new category should be. UI surfaces these
 *                              loudly so they don't accumulate silently.
 */
export type EvidenceKind =
  | 'manual_note'
  | 'screenshot'
  | 'meeting_held'
  | 'document_produced'
  | 'message_sent'
  | 'metric_snapshot'
  | 'human_attestation'
  | 'other';

/**
 * Tier locked by evidence kind. Application reads tier from this map; the
 * API never accepts a tier field on evidence creation. Per Chief Architect:
 * "Evidence kind determines tier. Period."
 */
export const EVIDENCE_KIND_TIER: Record<EvidenceKind, EvidenceTier> = {
  manual_note: 'E0',
  other: 'E0',
  human_attestation: 'E1',
  screenshot: 'E2',
  meeting_held: 'E2',
  document_produced: 'E2',
  message_sent: 'E3',
  metric_snapshot: 'E4',
};

/**
 * Discriminated union by evidence kind. `human_attestation` is the only
 * shape that carries overrideReason + approvedBy — the old E1 path,
 * re-modeled as a first-class kind so tier is always implied by kind.
 */
export type EvidenceToken = EvidenceTokenStandard | EvidenceTokenAttestation;

interface EvidenceTokenBase {
  id: string;
  taskId: string;
  createdAt: string;
  createdBy: string;
  kind: string; // legacy free-text (kept for back-compat with 0013 callers)
  payload: Record<string, unknown>;
  signedBy: string | null;
  verifiedAt: string | null;
  validatorVersion: string | null;
  /** P007 — provenance: where this record entered the system. */
  sourceKind: EvidenceSourceKind;
  /** P007 — opaque source identifier (connector run id, request id, etc). */
  sourceRef: string | null;
  /** P007 — factual evidence category from the locked vocabulary. */
  evidenceKind: EvidenceKind;
  /** P007 — reserved for future dedup (same screenshot, same metric snapshot, etc). */
  evidenceHash: string | null;
}

export interface EvidenceTokenStandard extends EvidenceTokenBase {
  tier: 'E0' | 'E2' | 'E3' | 'E4';
  overrideReason: null;
  approvedBy: null;
}

export interface EvidenceTokenAttestation extends EvidenceTokenBase {
  tier: 'E1';
  evidenceKind: 'human_attestation';
  overrideReason: string;
  approvedBy: string;
}

/**
 * Back-compat alias for callers that still reference the old union arm
 * names. These match the tier-bucketing from 0013 / Phase 1A code.
 */
export type EvidenceTokenE0_2_3_4 = EvidenceTokenStandard;
export type EvidenceTokenE1 = EvidenceTokenAttestation;

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
  validatorVersion: string;
}

/**
 * Instance-supplied governance limits. Lives on a typed object so the
 * platform never hardcodes per-company caps. See [[D018]] in the tracker.
 */
export interface GovernancePolicy {
  /** Hard cap on concurrent objectives in status='active'. */
  maxActiveObjectives: number;
}

// ---------- input shapes ----------

export interface CreateObjectiveInput {
  title: string;
  description?: string | null;
  ownerId?: string | null;
  status?: ObjectiveStatus;
  targetOutcomeSummary?: string | null;
}

export interface UpdateObjectiveInput {
  title?: string;
  description?: string | null;
  ownerId?: string | null;
  status?: ObjectiveStatus;
  targetOutcomeSummary?: string | null;
}

export interface CreateOutcomeInput {
  objectiveId: string;
  name: string;
  metricUnit?: string | null;
  baselineValue?: number | null;
  targetValue?: number | null;
  currentValue?: number | null;
  measurementSource?: OutcomeMeasurementSource;
}

export interface UpdateOutcomeMeasurementInput {
  currentValue: number;
  measuredAt?: string;
}

export interface CreateTaskInput {
  objectiveId: string;
  directiveId?: string | null;
  title: string;
  description?: string | null;
  capabilityRequired: string;
  ownerId?: string | null;
  evidenceRequired?: EvidenceRequirementSchema;
  dueAt?: string | null;
  /** P005A — set by the promotion endpoint when a CEO approves a proposal. */
  proposalId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  ownerId?: string | null;
  evidenceRequired?: EvidenceRequirementSchema;
  dueAt?: string | null;
  // status transitions go through dedicated endpoints — not via PATCH.
}

/**
 * P005A — Proposal-type discriminator.
 *
 * Carried on every TaskProposal so downstream engines (P007 Evidence,
 * P008 Outcome) can reason about different proposal shapes without
 * scanning free text. Chief Architect 2026-06-04: "Adding it now is
 * cheap; adding it after thousands of proposal rows exist is painful."
 *
 * - `action`     : the executive proposes the platform DO something
 *                  (run a campaign, push a release, send a message).
 * - `research`   : the executive proposes the platform LEARN something
 *                  (investigate competitor, audit a metric).
 * - `decision`   : the executive proposes the CEO MAKE a choice
 *                  (approve a price change, pick a vendor).
 * - `escalation` : the executive proposes something blocks the directive
 *                  and needs human attention BEFORE more work.
 */
export type ProposalType = 'action' | 'research' | 'decision' | 'escalation';

/** Lifecycle status on `ai_company.task_proposals.status`. */
export type ProposalStatus =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'superseded';

/**
 * P005A — Directive → TaskProposal layer.
 *
 * Cognitive-layer shape: what an AI executive emits on its structured
 * output. This is NOT a task. The transformer at the platform layer turns
 * it into a `task_proposals` row, dedup'd by fingerprint, awaiting CEO
 * promotion (per Chief Architect: governance boundary is the promotion
 * event, not the report).
 *
 * Field notes:
 *   - `capabilityRequired` — deterministic capability name (never a vendor).
 *   - `proposalType` — defaults to 'action' when omitted by the LLM. The
 *     fingerprint always includes it.
 *   - `evidenceRequired` — applied to the eventual Task on promotion;
 *     defaults to `{ minTier: 'E2', requiredKinds: [], minCount: 1 }`.
 *   - `priority` / `dueInDays` — advisory hints; translated to `dueAt` on
 *     the Task at promotion time.
 */
export interface TaskProposal {
  title: string;
  description?: string | null;
  capabilityRequired: string;
  proposalType?: ProposalType;
  priority?: 'low' | 'medium' | 'high';
  dueInDays?: number;
  evidenceRequired?: EvidenceRequirementSchema;
}

/**
 * Persisted shape — one row in `ai_company.task_proposals`. The fingerprint
 * is the dedup key against (directive_id, fingerprint). When the same
 * proposal is re-emitted (same fingerprint), the row's `generation` is bumped
 * instead of inserting a duplicate.
 */
export interface TaskProposalRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  directiveId: string;
  sourceExecutiveId: string;
  proposalType: ProposalType;
  fingerprint: string;
  payload: TaskProposal;
  status: ProposalStatus;
  generation: number;
  decidedAt: string | null;
  decidedBy: string | null;
}

/** Insert/upsert shape for `ai_company.task_proposals`. */
export interface UpsertTaskProposalInput {
  directiveId: string;
  sourceExecutiveId: string;
  proposalType: ProposalType;
  fingerprint: string;
  payload: TaskProposal;
}

/** Status transition on a proposal — used by the promote / reject endpoints. */
export interface DecideTaskProposalInput {
  status: 'approved' | 'rejected';
  decidedBy: string;
}

/**
 * P007 — Create-evidence input.
 *
 * Tier is NOT supplied by the caller; it is derived from `evidenceKind` via
 * EVIDENCE_KIND_TIER (kind owns tier — Chief Architect 2026-06-05).
 *
 * `createdBy` is required (mirrors P006 provenance floor).
 * `payload` is validated per-kind at the doos-core boundary.
 * `evidenceHash` is optional and reserved for future dedup.
 *
 * For `evidenceKind: 'human_attestation'` (the E1 override path), both
 * `overrideReason` and `approvedBy` must be supplied.
 */
export interface CreateEvidenceTokenInput {
  evidenceKind: EvidenceKind;
  payload: Record<string, unknown>;
  sourceKind: EvidenceSourceKind;
  sourceRef?: string | null;
  createdBy: string;
  signedBy?: string | null;
  evidenceHash?: string | null;
  /** Required when evidenceKind === 'human_attestation'. */
  overrideReason?: string;
  /** Required when evidenceKind === 'human_attestation'. */
  approvedBy?: string;
  /**
   * @deprecated Use evidenceKind. Carried for 0013-era callers; if supplied
   * and evidenceKind is absent, callers should map it to 'other' with the
   * legacy value surfaced via payload.legacyKind.
   */
  kind?: string;
}
