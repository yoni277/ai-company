import type {
  FinancialIntelligenceSnapshot,
  PortfolioFinancialSnapshot,
} from '@ai-company/shared-types';

export {
  buildFinancialIntelligenceFromRevenueSnapshots,
  revenueSnapshotToFinancialSnapshot,
} from './from-revenue';
export { computeFinancialTrend } from './trend';
export { aggregatePortfolioFinancial } from './aggregate';

/** CEO brief line — visibility only, no recommendations. */
export function formatFinancialOverview(
  row: FinancialIntelligenceSnapshot,
): string {
  const f = row.financial;
  const symbol = currencySymbol(f.currency);
  const formatted = formatMoney(f.totalRevenue, symbol);
  const tx = f.transactionCount;
  const txLabel = tx === 1 ? 'transaction' : 'transactions';
  const base = `${f.projectName} generated ${formatted} from ${tx} ${txLabel}.`;

  const { revenueGrowthPercent, transactionGrowthPercent } = row.trend;
  if (revenueGrowthPercent === null && transactionGrowthPercent === null) {
    return `${base} Revenue trend is not available yet because no previous snapshot exists.`;
  }

  const parts: string[] = [];
  if (revenueGrowthPercent !== null) {
    parts.push(`revenue ${formatSignedPercent(revenueGrowthPercent)}`);
  }
  if (transactionGrowthPercent !== null) {
    parts.push(`transactions ${formatSignedPercent(transactionGrowthPercent)}`);
  }
  return `${base} Trend: ${parts.join('; ')}.`;
}

export function formatFinancialOverviews(
  snapshot: PortfolioFinancialSnapshot,
): string[] {
  const active = snapshot.projects.filter(
    (p) => p.financial.totalRevenue > 0 || p.financial.transactionCount > 0,
  );
  if (active.length === 0) {
    return ['No financial activity recorded in the reporting period.'];
  }
  return active.map((p) => formatFinancialOverview(p));
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

function currencySymbol(currency: string): string {
  return currency.toUpperCase() === 'ILS' ? '₪' : currency.toUpperCase() === 'USD' ? '$' : currency;
}

function formatMoney(amount: number, symbol: string): string {
  return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
}
