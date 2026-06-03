import type { FinancialSnapshot, FinancialTrend } from '@ai-company/shared-types';

/** Compute growth % when a previous snapshot exists; otherwise null trend fields. */
export function computeFinancialTrend(
  current: FinancialSnapshot,
  previous?: FinancialSnapshot,
): FinancialTrend {
  if (!previous) {
    return { revenueGrowthPercent: null, transactionGrowthPercent: null };
  }
  return {
    revenueGrowthPercent: percentChange(previous.totalRevenue, current.totalRevenue),
    transactionGrowthPercent: percentChange(
      previous.transactionCount,
      current.transactionCount,
    ),
  };
}

function percentChange(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
