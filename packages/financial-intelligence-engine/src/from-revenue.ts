import { normalizeRevenueMetrics } from '@ai-company/revenue-intelligence-engine';
import type {
  FinancialIntelligenceSnapshot,
  FinancialSnapshot,
  PortfolioFinancialSnapshot,
  RevenueSnapshot,
} from '@ai-company/shared-types';
import { aggregatePortfolioFinancial } from './aggregate';
import { computeFinancialTrend } from './trend';

/** Convert Phase 5A revenue snapshot to normalized financial snapshot. */
export function revenueSnapshotToFinancialSnapshot(
  revenue: RevenueSnapshot,
  displayCurrency?: string,
): FinancialSnapshot {
  const currency =
    displayCurrency?.toUpperCase() ?? revenue.metrics.currency.toUpperCase();
  const m = normalizeRevenueMetrics(revenue.metrics, currency);
  return {
    projectId: revenue.projectId,
    projectName: revenue.projectName,
    totalRevenue: m.totalRevenue,
    recurringRevenue: m.recurringRevenue,
    transactionCount: m.transactionCount,
    averageTransactionValue: m.averageTransactionValue,
    currency: m.currency,
    capturedAt: revenue.capturedAt,
  };
}

/**
 * Build portfolio financial intelligence from revenue snapshots.
 * Trends are null unless matching previous snapshots are supplied by projectId.
 */
export function buildFinancialIntelligenceFromRevenueSnapshots(
  current: RevenueSnapshot[],
  options?: { previous?: RevenueSnapshot[]; displayCurrency?: string },
): PortfolioFinancialSnapshot {
  const displayCurrency = options?.displayCurrency ?? pickDisplayCurrency(current);
  const previousByProject = indexPreviousFinancial(options?.previous, displayCurrency);

  const projects: FinancialIntelligenceSnapshot[] = current.map((s) => {
    const financial = revenueSnapshotToFinancialSnapshot(s, displayCurrency);
    const prev = previousByProject.get(s.projectId);
    const trend = computeFinancialTrend(financial, prev);
    return {
      projectId: s.projectId,
      projectName: s.projectName,
      financial,
      trend,
      live: s.live,
    };
  });

  const totals = aggregatePortfolioFinancial(projects, displayCurrency);

  return {
    ...totals,
    projects,
    capturedAt: new Date().toISOString(),
  };
}

function indexPreviousFinancial(
  previous: RevenueSnapshot[] | undefined,
  displayCurrency: string,
): Map<string, FinancialSnapshot> {
  const map = new Map<string, FinancialSnapshot>();
  if (!previous?.length) return map;
  for (const s of previous) {
    map.set(s.projectId, revenueSnapshotToFinancialSnapshot(s, displayCurrency));
  }
  return map;
}

function pickDisplayCurrency(snapshots: RevenueSnapshot[]): string {
  const ils = snapshots.some((s) => s.metrics.currency.toUpperCase() === 'ILS');
  return ils ? 'ILS' : (snapshots[0]?.metrics.currency.toUpperCase() ?? 'ILS');
}
