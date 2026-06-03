import type { RevenueSnapshot } from '@ai-company/shared-types';

/** Read-only revenue connector contract. */
export interface RevenueConnector {
  readonly projectId: string;
  readonly projectName: string;
  readonly live: boolean;
  getRevenueSnapshot(): Promise<RevenueSnapshot>;
}

export type RevenueSourceType =
  | 'foodtruck-supabase-events'
  | 'supabase-ledger'
  | 'stripe'
  | 'erp'
  | 'csv-import'
  | 'mock-revenue';

export interface RevenueSourceConfig {
  revenueSource?: RevenueSourceType;
  reportingDays?: number;
  currency?: string;
  avgTransactionValue?: number;
  monthlySubscriptionFee?: number;
  totalRevenue?: number;
  recurringRevenue?: number;
  transactionCount?: number;
}
