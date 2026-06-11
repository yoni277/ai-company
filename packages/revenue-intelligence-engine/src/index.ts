import {
  buildScoringMeta,
  type PortfolioRevenueSnapshot,
  type ProjectRevenueRollup,
  type RevenueMetrics,
  type RevenueSnapshot,
  type RevenueTrend,
} from '@ai-company/shared-types';

const FX_TO_ILS: Record<string, number> = {
  ILS: 1,
  USD: 3.7,
  EUR: 4.0,
};

/**
 * P1-1 — named revenue-trend thresholds. computeRevenueTrend reads these (not
 * inline literals), and `policyVersion` derives from them, so a threshold change
 * bumps the version AND the classification together. (Config extraction is P1-2;
 * FX rates are conversion constants, not scoring weights.)
 */
const POLICY = {
  trendUpThresholdPercent: 2,
  trendDownThresholdPercent: -2,
} as const;

const ALGORITHM_VERSION = 1;
export const REVENUE_SCORING_META = buildScoringMeta('revenue', ALGORITHM_VERSION, POLICY);

/** Normalize amount to target currency (deterministic fixed rates). */
export function normalizeAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  const fromRate = FX_TO_ILS[from] ?? 1;
  const toRate = FX_TO_ILS[to] ?? 1;
  const inIls = amount * fromRate;
  return Math.round((inIls / toRate) * 100) / 100;
}

export function normalizeRevenueMetrics(
  metrics: RevenueMetrics,
  displayCurrency: string,
): RevenueMetrics {
  const currency = displayCurrency.toUpperCase();
  return {
    totalRevenue: normalizeAmount(metrics.totalRevenue, metrics.currency, currency),
    recurringRevenue: normalizeAmount(metrics.recurringRevenue, metrics.currency, currency),
    transactionCount: metrics.transactionCount,
    averageTransactionValue: normalizeAmount(
      metrics.averageTransactionValue,
      metrics.currency,
      currency,
    ),
    currency,
  };
}

/** Aggregate project snapshots into portfolio totals. No AI. No LLM. */
export function aggregatePortfolioRevenue(
  snapshots: RevenueSnapshot[],
  options?: { displayCurrency?: string; previous?: RevenueSnapshot[] },
): PortfolioRevenueSnapshot {
  const displayCurrency = options?.displayCurrency ?? pickDisplayCurrency(snapshots);
  const projects: ProjectRevenueRollup[] = snapshots.map((s) => {
    const m = normalizeRevenueMetrics(s.metrics, displayCurrency);
    return {
      projectId: s.projectId,
      projectName: s.projectName,
      totalRevenue: m.totalRevenue,
      recurringRevenue: m.recurringRevenue,
      transactionCount: m.transactionCount,
      averageTransactionValue: m.averageTransactionValue,
      currency: m.currency,
      live: s.live,
    };
  });

  const totals = sumMetrics(projects, displayCurrency);
  const trend = options?.previous
    ? computeRevenueTrend(snapshots, options.previous, displayCurrency)
    : null;

  return {
    projects,
    totals,
    trend,
    capturedAt: new Date().toISOString(),
    ...REVENUE_SCORING_META,
  };
}

export function computeRevenueTrend(
  current: RevenueSnapshot[],
  previous: RevenueSnapshot[],
  displayCurrency: string,
): RevenueTrend {
  const cur = sumSnapshots(current, displayCurrency);
  const prev = sumSnapshots(previous, displayCurrency);
  const totalRevenueChangePercent = percentChange(prev.totalRevenue, cur.totalRevenue);
  const transactionCountChangePercent = percentChange(
    prev.transactionCount,
    cur.transactionCount,
  );
  const direction: RevenueTrend['direction'] =
    totalRevenueChangePercent > POLICY.trendUpThresholdPercent
      ? 'up'
      : totalRevenueChangePercent < POLICY.trendDownThresholdPercent
        ? 'down'
        : 'flat';
  return { totalRevenueChangePercent, transactionCountChangePercent, direction };
}

/** CEO brief line per project — visibility only. */
export function formatRevenueSummary(snapshot: RevenueSnapshot): string {
  const m = snapshot.metrics;
  const symbol = currencySymbol(m.currency);
  const formatted = formatMoney(m.totalRevenue, symbol);
  const tx = m.transactionCount;
  const txLabel = tx === 1 ? 'transaction' : 'transactions';
  return `${snapshot.projectName} generated ${formatted} from ${tx} ${txLabel} during the reporting period.`;
}

export function formatRevenueSummaries(snapshots: RevenueSnapshot[]): string[] {
  const withRevenue = snapshots.filter((s) => s.metrics.totalRevenue > 0 || s.metrics.transactionCount > 0);
  if (withRevenue.length === 0) {
    return ['No revenue activity recorded in the reporting period.'];
  }
  return withRevenue.map((s) => formatRevenueSummary(s));
}

function sumMetrics(projects: ProjectRevenueRollup[], currency: string): RevenueMetrics {
  const totalRevenue = projects.reduce((n, p) => n + p.totalRevenue, 0);
  const recurringRevenue = projects.reduce((n, p) => n + p.recurringRevenue, 0);
  const transactionCount = projects.reduce((n, p) => n + p.transactionCount, 0);
  const averageTransactionValue =
    transactionCount > 0
      ? Math.round((totalRevenue / transactionCount) * 100) / 100
      : 0;
  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    recurringRevenue: Math.round(recurringRevenue * 100) / 100,
    transactionCount,
    averageTransactionValue,
    currency,
  };
}

function sumSnapshots(snapshots: RevenueSnapshot[], displayCurrency: string): RevenueMetrics {
  const normalized = snapshots.map((s) =>
    normalizeRevenueMetrics(s.metrics, displayCurrency),
  );
  const totalRevenue = normalized.reduce((n, m) => n + m.totalRevenue, 0);
  const recurringRevenue = normalized.reduce((n, m) => n + m.recurringRevenue, 0);
  const transactionCount = normalized.reduce((n, m) => n + m.transactionCount, 0);
  return {
    totalRevenue,
    recurringRevenue,
    transactionCount,
    averageTransactionValue:
      transactionCount > 0 ? Math.round((totalRevenue / transactionCount) * 100) / 100 : 0,
    currency: displayCurrency,
  };
}

function pickDisplayCurrency(snapshots: RevenueSnapshot[]): string {
  const ils = snapshots.some((s) => s.metrics.currency.toUpperCase() === 'ILS');
  return ils ? 'ILS' : (snapshots[0]?.metrics.currency.toUpperCase() ?? 'ILS');
}

function percentChange(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function currencySymbol(currency: string): string {
  return currency.toUpperCase() === 'ILS' ? '₪' : currency.toUpperCase() === 'USD' ? '$' : currency;
}

function formatMoney(amount: number, symbol: string): string {
  const rounded = Math.round(amount);
  return `${symbol}${rounded.toLocaleString('en-US')}`;
}
