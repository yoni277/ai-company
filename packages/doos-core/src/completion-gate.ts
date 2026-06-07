import type {
  CreateEvidenceTokenInput,
  EvidenceKind,
  EvidenceTier,
  EvidenceToken,
  Task,
} from '@ai-company/shared-types';
import { validateEvidenceForTask, VALIDATOR_VERSION } from './validator';

/**
 * The single source of truth for kind→tier mapping. Mirrors
 * `EVIDENCE_KIND_TIER` exported from @ai-company/shared-types — kept inlined
 * here so doos-core has no runtime value import from shared-types (only
 * type imports, which are stripped). Drift is caught by the dedicated test
 * in tests/completion-gate.test.ts.
 *
 * If you change this table, change shared-types' EVIDENCE_KIND_TIER too.
 */
const KIND_TIER: Record<EvidenceKind, EvidenceTier> = {
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
 * P007 — Completion Gate.
 *
 * Wraps the existing deterministic validator into a UI/API-friendly shape:
 *   - `ready`   : may the task transition to status='completed' right now?
 *   - `reasons` : when not ready, every unmet requirement (so the operator
 *                 sees all gaps at once, not one round-trip per fix).
 *
 * The gate is consulted at two points (Chief Architect Q4 = both):
 *   1. GET /api/tasks/[id]/evidence — the UI shows the current gate state.
 *   2. POST /api/tasks/[id]/complete — the API re-evaluates atomically to
 *      close the TOCTOU window between the UI read and the operator click.
 *
 * Pure function. No I/O. No LLM. Deterministic.
 */
export interface CompletionGateResult {
  ready: boolean;
  reasons: string[];
  validatorVersion: string;
}

export function evaluateCompletionGate(
  task: Task,
  tokens: EvidenceToken[],
): CompletionGateResult {
  const validation = validateEvidenceForTask(task, tokens);
  return {
    ready: validation.valid,
    reasons: validation.reasons,
    validatorVersion: validation.validatorVersion,
  };
}

/**
 * Re-export the validator version so the API + tests can stamp it on
 * recorded gate decisions if needed.
 */
export { VALIDATOR_VERSION };

// ---------------------------------------------------------------------------
// P007 — Per-kind payload validators.
//
// Each evidence kind has a strict payload schema. The API validates with
// `validateEvidencePayload(kind, payload)` BEFORE writing to the repository.
// Pure structural checks only — no I/O, no LLM, no "looks reasonable" magic.
// Chief Architect: evidence records must be deterministic.
// ---------------------------------------------------------------------------

export interface PayloadValidationResult {
  valid: boolean;
  reasons: string[];
}

function ok(): PayloadValidationResult {
  return { valid: true, reasons: [] };
}

function fail(...reasons: string[]): PayloadValidationResult {
  return { valid: false, reasons };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  // RFC 3339 / ISO 8601 with timezone (Z or ±HH:MM). Strict — the operator
  // can submit Date.toISOString() output unchanged.
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
    value,
  );
}

export function validateEvidencePayload(
  kind: EvidenceKind,
  payload: Record<string, unknown>,
): PayloadValidationResult {
  switch (kind) {
    case 'manual_note': {
      if (!isNonEmptyString(payload.text)) return fail('payload.text must be a non-empty string');
      if (!isNonEmptyString(payload.author))
        return fail('payload.author must be a non-empty string');
      return ok();
    }
    case 'screenshot': {
      if (!isNonEmptyString(payload.url)) return fail('payload.url must be a non-empty string');
      if (!isIsoTimestamp(payload.capturedAt))
        return fail('payload.capturedAt must be an ISO timestamp');
      return ok();
    }
    case 'meeting_held': {
      if (!Array.isArray(payload.attendees) || payload.attendees.length === 0)
        return fail('payload.attendees must be a non-empty array');
      if (!isFiniteNumber(payload.durationMinutes) || (payload.durationMinutes as number) <= 0)
        return fail('payload.durationMinutes must be a positive number');
      if (!isIsoTimestamp(payload.heldAt))
        return fail('payload.heldAt must be an ISO timestamp');
      return ok();
    }
    case 'document_produced': {
      if (!isNonEmptyString(payload.title)) return fail('payload.title must be a non-empty string');
      if (!isNonEmptyString(payload.url)) return fail('payload.url must be a non-empty string');
      if (!isIsoTimestamp(payload.producedAt))
        return fail('payload.producedAt must be an ISO timestamp');
      return ok();
    }
    case 'message_sent': {
      if (!isNonEmptyString(payload.channel))
        return fail('payload.channel must be a non-empty string');
      if (!isNonEmptyString(payload.recipient))
        return fail('payload.recipient must be a non-empty string');
      if (!isIsoTimestamp(payload.sentAt))
        return fail('payload.sentAt must be an ISO timestamp');
      return ok();
    }
    case 'metric_snapshot': {
      if (!isNonEmptyString(payload.metricName))
        return fail('payload.metricName must be a non-empty string');
      if (!isFiniteNumber(payload.value))
        return fail('payload.value must be a finite number');
      if (!isIsoTimestamp(payload.observedAt))
        return fail('payload.observedAt must be an ISO timestamp');
      if (!isNonEmptyString(payload.source))
        return fail('payload.source must be a non-empty string');
      return ok();
    }
    case 'human_attestation': {
      if (!isNonEmptyString(payload.statement))
        return fail('payload.statement must be a non-empty string');
      return ok();
    }
    case 'other': {
      // Classification debt. Chief Architect: visibility, not erasure.
      if (!isNonEmptyString(payload.description))
        return fail('payload.description must be a non-empty string (classification debt)');
      if (!isNonEmptyString(payload.proposedKind))
        return fail(
          'payload.proposedKind must be a non-empty string — name the kind this record should eventually become',
        );
      return ok();
    }
  }
}

/**
 * Resolve the tier for a given kind. The API uses this — never accepts
 * tier from the caller. Locked per Chief Architect.
 */
export function tierForKind(kind: EvidenceKind): EvidenceTier {
  return KIND_TIER[kind];
}

/**
 * Composite create-time validator. Returns reasons for every defect at once.
 * Used by the API + the repository's create method.
 */
export function validateCreateEvidenceInput(
  input: CreateEvidenceTokenInput,
): PayloadValidationResult {
  const reasons: string[] = [];

  if (!isNonEmptyString(input.createdBy)) reasons.push('createdBy must be non-empty');
  if (!input.sourceKind) reasons.push('sourceKind is required');
  if (!input.evidenceKind) reasons.push('evidenceKind is required');
  if (!input.payload || typeof input.payload !== 'object')
    reasons.push('payload must be an object');

  if (reasons.length > 0) return fail(...reasons);

  const payloadResult = validateEvidencePayload(input.evidenceKind, input.payload);
  if (!payloadResult.valid) return payloadResult;

  // human_attestation kind requires overrideReason + approvedBy.
  if (input.evidenceKind === 'human_attestation') {
    if (!isNonEmptyString(input.overrideReason))
      return fail('human_attestation requires overrideReason');
    if (!isNonEmptyString(input.approvedBy))
      return fail('human_attestation requires approvedBy');
  }

  return ok();
}
