/** Per-project financial facts (normalized, deterministic). */
export interface FinancialSnapshot {
  projectId: string;
  projectName: string;
  totalRevenue: number;
  recurringRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  currency: string;
  capturedAt: string;
}

/** Period-over-period growth; null when no previous snapshot exists. */
export interface FinancialTrend {
  revenueGrowthPercent: number | null;
  transactionGrowthPercent: number | null;
}

/** Per-project financial intelligence with trend. */
export interface FinancialIntelligenceSnapshot {
  projectId: string;
  projectName: string;
  financial: FinancialSnapshot;
  trend: FinancialTrend;
  /** From revenue connector — live vs mock-configured amounts. */
  live: boolean;
}

/** Portfolio-wide financial rollup. */
export interface PortfolioFinancialSnapshot {
  totalRevenue: number;
  recurringRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  currency: string;
  projects: FinancialIntelligenceSnapshot[];
  capturedAt: string;
}
