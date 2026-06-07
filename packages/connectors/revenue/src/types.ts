import type { RevenueSnapshot } from '@ai-company/shared-types';

/** Read-only revenue connector contract. */
export interface RevenueConnector {
  readonly projectId: string;
  readonly projectName: string;
  readonly live: boolean;
  getRevenueSnapshot(): Promise<RevenueSnapshot>;
}

/**
 * Built-in generic revenue sources. Instance-registered sources (resolved via
 * the revenue resolver registry) use arbitrary keys, so the type stays open
 * with `(string & {})` — this preserves autocomplete for the known literals
 * while accepting any instance-driven `revenueSource`. The generic layer names
 * no specific business source. See P015B.
 */
export type RevenueSourceType =
  | 'supabase-ledger'
  | 'stripe'
  | 'erp'
  | 'csv-import'
  | 'mock-revenue'
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

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
