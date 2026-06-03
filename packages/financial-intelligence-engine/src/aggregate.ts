import type {
  FinancialIntelligenceSnapshot,
  PortfolioFinancialSnapshot,
} from '@ai-company/shared-types';

/** Sum per-project financial rows into portfolio totals. No AI. No LLM. */
export function aggregatePortfolioFinancial(
  projects: FinancialIntelligenceSnapshot[],
  displayCurrency: string,
): Pick<
  PortfolioFinancialSnapshot,
  'totalRevenue' | 'recurringRevenue' | 'transactionCount' | 'averageTransactionValue' | 'currency'
> {
  const currency = displayCurrency.toUpperCase();
  const totalRevenue = projects.reduce((n, p) => n + p.financial.totalRevenue, 0);
  const recurringRevenue = projects.reduce((n, p) => n + p.financial.recurringRevenue, 0);
  const transactionCount = projects.reduce((n, p) => n + p.financial.transactionCount, 0);
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
