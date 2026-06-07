import type {
  EvidenceTier,
  EvidenceToken,
  Task,
  ValidationResult,
} from '@ai-company/shared-types';

/**
 * Bump this when validator rules change. Every accepted token records the
 * version at verify time so historical audits remain reproducible.
 */
export const VALIDATOR_VERSION = '1';

const TIER_RANK: Record<EvidenceTier, number> = {
  E0: 0,
  E1: 1,
  E2: 2,
  E3: 3,
  E4: 4,
};

export function rankTier(tier: EvidenceTier): number {
  return TIER_RANK[tier];
}

/**
 * Deterministic evidence validator. Phase 1C contract:
 *
 *   1. At least `minCount` tokens are present.
 *   2. Every required kind in `requiredKinds` appears at least once across
 *      the tokens.
 *   3. The COUNT of tokens whose tier ≥ `minTier` is itself ≥ `minCount`.
 *      (Low-tier tokens don't satisfy the minimum.)
 *   4. Every E1 token has both `overrideReason` and `approvedBy` set.
 *
 * Returns the full reason list so the UI / API can surface every failure
 * at once instead of one-at-a-time.
 *
 * Pure function. No I/O. No LLM. No randomness.
 */
export function validateEvidenceForTask(
  task: Task,
  tokens: EvidenceToken[],
): ValidationResult {
  const reasons: string[] = [];
  const req = task.evidenceRequired;

  // Rule 4: structural validity of E1 overrides comes first so a malformed
  // E1 doesn't accidentally count toward minCount.
  const malformedE1 = tokens.filter(
    (t) =>
      t.tier === 'E1' &&
      (!('overrideReason' in t) ||
        !('approvedBy' in t) ||
        !t.overrideReason ||
        !t.approvedBy),
  );
  for (const t of malformedE1) {
    reasons.push(
      `E1 token ${t.id} is missing overrideReason and/or approvedBy`,
    );
  }
  const validE1Ids = new Set(malformedE1.map((t) => t.id));
  const eligibleTokens = tokens.filter((t) => !validE1Ids.has(t.id));

  // Rule 1
  if (eligibleTokens.length < req.minCount) {
    reasons.push(
      `minCount=${req.minCount} not met (have ${eligibleTokens.length} eligible token(s))`,
    );
  }

  // Rule 2
  const kindsPresent = new Set(eligibleTokens.map((t) => t.kind));
  for (const kind of req.requiredKinds) {
    if (!kindsPresent.has(kind)) {
      reasons.push(`requiredKind missing: ${kind}`);
    }
  }

  // Rule 3
  const minRank = TIER_RANK[req.minTier];
  const atOrAboveMinTier = eligibleTokens.filter(
    (t) => TIER_RANK[t.tier] >= minRank,
  );
  if (atOrAboveMinTier.length < req.minCount) {
    reasons.push(
      `minTier=${req.minTier} not satisfied by enough tokens ` +
        `(have ${atOrAboveMinTier.length} at/above tier, need ${req.minCount})`,
    );
  }

  return {
    valid: reasons.length === 0,
    reasons,
    validatorVersion: VALIDATOR_VERSION,
  };
}
