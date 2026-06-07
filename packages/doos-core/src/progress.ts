import type { ObjectiveOutcome } from '@ai-company/shared-types';

/**
 * Fraction of the way from baseline → target. Returns `null` when any of
 * the three values needed is absent or when baseline === target (no scale).
 *
 * Clamps to [0, 1] when target > baseline; negative motion is reported as 0.
 * For decreasing targets (e.g. churn reduction) where target < baseline,
 * the same formula applies — fraction is still 0 at baseline, 1 at target.
 */
export function outcomeProgressFraction(
  outcome: Pick<
    ObjectiveOutcome,
    'baselineValue' | 'targetValue' | 'currentValue'
  >,
): number | null {
  const { baselineValue, targetValue, currentValue } = outcome;
  if (
    baselineValue === null ||
    targetValue === null ||
    currentValue === null
  ) {
    return null;
  }
  if (baselineValue === targetValue) return null;
  const moved = currentValue - baselineValue;
  const span = targetValue - baselineValue;
  const raw = moved / span;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}
