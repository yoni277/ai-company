/**
 * D6 / P0-2 — Risk provenance boundary (PURE core).
 *
 * The deterministic-scoring boundary for risks. Given the open risks and the set
 * of risk ids the CEO has explicitly confirmed (an existing ceo_decisions
 * record), it decides which risks may move a deterministic score and marks the
 * rest advisory (visible, not scored).
 *
 * Rule (CA-binding):
 *   - connector:* / system:* (deterministic band) → counted in scoring.
 *   - executive:* / unknown   (advisory band)     → NOT scored, UNLESS the risk
 *     id is confirmed via a ceo_decisions record (explicit CEO acceptance).
 *
 * No free-text, no business specifics. The classifier lives in shared-types
 * (classifyProvenance); this module applies it at the boundary. Pure +
 * unit-tested; the server reader (phase2-metrics.ts) supplies the rows and the
 * confirmed-id set.
 */

import { classifyProvenance, type ProvenanceBand } from '@ai-company/shared-types';

export interface RiskForProvenance {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
}

export type MarkedRisk<R> = R & {
  band: ProvenanceBand;
  /** True when the risk is advisory AND NOT confirmed — visible but unscored. */
  advisory: boolean;
  /** True when an advisory risk was promoted into scoring via CEO confirmation. */
  confirmed: boolean;
};

export interface RiskProvenanceResult<R> {
  /**
   * Critical-risk count that feeds the deterministic health score. Counts a risk
   * only when it enters scoring (deterministic band, or advisory+confirmed) AND
   * severity === 'critical'. This is the number that replaces the unfiltered
   * `openRisks.filter(critical).length`.
   */
  deterministicCriticalCount: number;
  /** Every risk, provenance-marked — for topRisks (advisory risks stay visible). */
  marked: Array<MarkedRisk<R>>;
  /** Sources that matched no known band (failed safe to advisory) — caller warns. */
  unknownSources: string[];
}

/**
 * Partition risks by provenance at the deterministic boundary. Pure.
 *
 * @param risks            all open risks
 * @param confirmedRiskIds risk ids confirmed by an existing ceo_decisions record
 */
export function partitionRiskProvenance<R extends RiskForProvenance>(
  risks: readonly R[],
  confirmedRiskIds: ReadonlySet<string>,
): RiskProvenanceResult<R> {
  let deterministicCriticalCount = 0;
  const unknownSources: string[] = [];

  const marked = risks.map((r): MarkedRisk<R> => {
    const { band, unknown } = classifyProvenance(r.source);
    if (unknown) unknownSources.push(r.source ?? '');

    const confirmed = band === 'advisory' && confirmedRiskIds.has(r.id);
    const entersScoring = band === 'deterministic' || confirmed;
    const advisory = band === 'advisory' && !confirmed;

    if (entersScoring && r.severity === 'critical') {
      deterministicCriticalCount += 1;
    }

    return { ...r, band, advisory, confirmed };
  });

  return { deterministicCriticalCount, marked, unknownSources };
}
