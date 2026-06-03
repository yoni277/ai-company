/** Deterministic revenue metrics for one project or portfolio totals. */
export interface RevenueMetrics {
  totalRevenue: number;
  recurringRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  currency: string;
}

/** Read-only revenue observation for one portfolio project. */
export interface RevenueSnapshot {
  projectId: string;
  projectName: string;
  metrics: RevenueMetrics;
  live: boolean;
  capturedAt: string;
}

/** Period-over-period revenue trend (deterministic). */
export interface RevenueTrend {
  totalRevenueChangePercent: number;
  transactionCountChangePercent: number;
  direction: 'up' | 'flat' | 'down';
}

/** Per-project rollup for portfolio views. */
export interface ProjectRevenueRollup {
  projectId: string;
  projectName: string;
  totalRevenue: number;
  recurringRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  currency: string;
  live: boolean;
}

/** Aggregated revenue across the portfolio. */
export interface PortfolioRevenueSnapshot {
  projects: ProjectRevenueRollup[];
  totals: RevenueMetrics;
  trend: RevenueTrend | null;
  capturedAt: string;
}
