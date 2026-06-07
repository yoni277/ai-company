import type {
  CreateTaskOutcomeInput,
  OutcomeDirection,
  OutcomeSource,
} from '@ai-company/shared-types';

/**
 * P008 — Outcome Attribution validator.
 *
 * Pure function. No I/O. No LLM. No randomness. Deterministic for a given
 * input. Doctrine enforced (Chief Architect 2026-06-05):
 *
 *   1. recordedBy is non-empty (provenance — same floor as P006 / P007).
 *   2. metricName matches /^[a-z][a-z0-9_]*$/ — forces identifier-style
 *      names. "campaign was successful" fails; "verified_truck_owners"
 *      passes. Structural anti-subjective check.
 *   3. baselineValue + observedValue are finite numbers.
 *   4. direction is consistent with the math (operator can't lie about
 *      which way the number moved).
 *   5. observedAt / windowStart / windowEnd are ISO timestamps.
 *   6. windowStart <= observedAt <= windowEnd.
 *   7. windowStart <= windowEnd.
 *   8. source is one of the three allowed values.
 *   9. source='connector_metric' requires sourceRef.
 *  10. source='verified_measurement' requires sourceRef.
 */

export interface OutcomeValidationResult {
  valid: boolean;
  reasons: string[];
}

const METRIC_NAME_RE = /^[a-z][a-z0-9_]*$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const VALID_SOURCES: ReadonlySet<OutcomeSource> = new Set([
  'manual',
  'connector_metric',
  'verified_measurement',
]);
const VALID_DIRECTIONS: ReadonlySet<OutcomeDirection> = new Set([
  'increase',
  'decrease',
  'unchanged',
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && ISO_RE.test(value);
}

export function validateCreateOutcomeInput(
  input: CreateTaskOutcomeInput,
): OutcomeValidationResult {
  const reasons: string[] = [];

  // Rule 1
  if (!isNonEmptyString(input.recordedBy)) {
    reasons.push('recordedBy must be a non-empty string');
  }

  // Rule 2
  if (typeof input.metricName !== 'string' || !METRIC_NAME_RE.test(input.metricName)) {
    reasons.push(
      'metricName must match /^[a-z][a-z0-9_]*$/ (deterministic identifier; no spaces, no caps, no punctuation)',
    );
  }

  // Rule 3
  if (!isFiniteNumber(input.baselineValue)) {
    reasons.push('baselineValue must be a finite number');
  }
  if (!isFiniteNumber(input.observedValue)) {
    reasons.push('observedValue must be a finite number');
  }

  // Rule 8
  if (!input.source || !VALID_SOURCES.has(input.source)) {
    reasons.push(
      `source must be one of: ${Array.from(VALID_SOURCES).join(', ')}`,
    );
  }

  // Direction value sanity (Rule 4 depends on values being parseable; do
  // this check independent of the math).
  if (!input.direction || !VALID_DIRECTIONS.has(input.direction)) {
    reasons.push(
      `direction must be one of: ${Array.from(VALID_DIRECTIONS).join(', ')}`,
    );
  }

  // Rule 5
  if (!isIsoTimestamp(input.observedAt)) {
    reasons.push('observedAt must be an ISO timestamp');
  }
  if (!isIsoTimestamp(input.windowStart)) {
    reasons.push('windowStart must be an ISO timestamp');
  }
  if (!isIsoTimestamp(input.windowEnd)) {
    reasons.push('windowEnd must be an ISO timestamp');
  }

  // If any of the above failed, bail before the math/window checks — they
  // depend on those values being well-formed and comparable.
  if (reasons.length > 0) return { valid: false, reasons };

  // Rule 4 — direction-math consistency. Operator's declared direction must
  // match the actual numeric movement.
  const diff = input.observedValue - input.baselineValue;
  if (input.direction === 'increase' && !(diff > 0)) {
    reasons.push(
      `direction='increase' inconsistent with observedValue (${input.observedValue}) <= baselineValue (${input.baselineValue})`,
    );
  } else if (input.direction === 'decrease' && !(diff < 0)) {
    reasons.push(
      `direction='decrease' inconsistent with observedValue (${input.observedValue}) >= baselineValue (${input.baselineValue})`,
    );
  } else if (input.direction === 'unchanged' && diff !== 0) {
    reasons.push(
      `direction='unchanged' inconsistent with observedValue (${input.observedValue}) != baselineValue (${input.baselineValue})`,
    );
  }

  // Rule 7
  if (input.windowStart > input.windowEnd) {
    reasons.push('windowStart must be <= windowEnd');
  }

  // Rule 6 — observed inside window
  if (
    input.observedAt < input.windowStart ||
    input.observedAt > input.windowEnd
  ) {
    reasons.push(
      `observedAt (${input.observedAt}) must be within [windowStart=${input.windowStart}, windowEnd=${input.windowEnd}]`,
    );
  }

  // Rules 9 + 10
  if (
    (input.source === 'connector_metric' || input.source === 'verified_measurement') &&
    !isNonEmptyString(input.sourceRef)
  ) {
    reasons.push(
      `source='${input.source}' requires sourceRef (the connector run id, measurement id, or equivalent)`,
    );
  }

  return { valid: reasons.length === 0, reasons };
}
