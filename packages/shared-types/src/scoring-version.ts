/**
 * P1-1 — Scoring versioning (generic, browser-safe; NO node:crypto).
 *
 * Every deterministic scoring engine stamps its computed output with:
 *   - scoringVersion: the ALGORITHM identity@version. Manual — bump it when the
 *     formula/logic itself changes.
 *   - policyVersion: a deterministic digest of THAT engine's own weights /
 *     thresholds. Changing a weight AUTO-bumps it (no manual discipline to
 *     forget) — directly testable.
 *
 * No persistence: scores are computed at request time and never stored
 * (migration assessment, Cowork-accepted), so the version rides on the computed
 * output object — no schema, no DDL.
 */

export interface ScoringMeta {
  scoringVersion: string;
  policyVersion: string;
}

/** FNV-1a 32-bit — deterministic, browser-safe (Math.imul), no crypto. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Stable serialization (sorted keys) so identical weights → identical string. */
function serializePolicy(policy: Readonly<Record<string, number>>): string {
  return Object.keys(policy)
    .sort()
    .map((k) => `${k}=${policy[k]}`)
    .join('|');
}

/**
 * Deterministic policy version for an engine's named weights/thresholds. Same
 * weights → same version; ANY weight change → a different version.
 */
export function policyVersion(engineId: string, policy: Readonly<Record<string, number>>): string {
  return `${engineId}#${fnv1a(serializePolicy(policy))}`;
}

/**
 * Build the `{ scoringVersion, policyVersion }` stamp for an engine.
 * `algorithmVersion` is the manually-bumped algorithm identity; `policy` is the
 * engine's own weights (the policyVersion derives from it).
 */
export function buildScoringMeta(
  engineId: string,
  algorithmVersion: string | number,
  policy: Readonly<Record<string, number>>,
): ScoringMeta {
  return {
    scoringVersion: `${engineId}@${algorithmVersion}`,
    policyVersion: policyVersion(engineId, policy),
  };
}
