/**
 * D6 / P0-2 — Provenance bands (generic, cloneable; no business specifics).
 *
 * CA architecture ruling (binding):
 *   connector:* / system:*  → deterministic metrics
 *   executive:*             → advisory layer
 *   unknown / empty         → advisory (FAIL SAFE) — never silently deterministic
 *
 * "No executive-generated risk may affect a deterministic score without an
 * explicit confirmation path." This classifier is the single place that maps a
 * record's `source` (the P006A provenance field) to its band. It decides nothing
 * about scoring — it only labels provenance; the deterministic boundary (the
 * caller) decides what a band is allowed to do.
 */

export type ProvenanceBand = 'deterministic' | 'advisory';

export interface ProvenanceClassification {
  band: ProvenanceBand;
  /**
   * True when the source matched no known prefix and was failed-safe to
   * advisory. The caller surfaces a warning (P1-3 spirit: no silent
   * deterministic from an unrecognized provenance).
   */
  unknown: boolean;
}

/**
 * Map a record's `source` to its provenance band. Deterministic only for the
 * explicit connector:/system: prefixes; everything else (including executive:*
 * and any unrecognized/empty value) is advisory. Pure.
 */
export function classifyProvenance(source: string | null | undefined): ProvenanceClassification {
  const s = (source ?? '').trim().toLowerCase();
  if (s.startsWith('connector:') || s.startsWith('system:')) {
    return { band: 'deterministic', unknown: false };
  }
  if (s.startsWith('executive:')) {
    return { band: 'advisory', unknown: false };
  }
  // Unknown / empty → advisory, fail safe. Never deterministic by default.
  return { band: 'advisory', unknown: true };
}
