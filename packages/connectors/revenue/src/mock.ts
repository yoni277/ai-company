import type { RevenueSnapshot } from '@ai-company/shared-types';
import type { RevenueConnector, RevenueSourceConfig } from './types';

export class MockRevenueConnector implements RevenueConnector {
  readonly live = false;

  constructor(
    readonly projectId: string,
    readonly projectName: string,
    private readonly config: RevenueSourceConfig,
  ) {}

  async getRevenueSnapshot(): Promise<RevenueSnapshot> {
    const currency = (this.config.currency ?? 'USD').toUpperCase();
    const transactionCount = this.config.transactionCount ?? 0;
    const totalRevenue = this.config.totalRevenue ?? 0;
    const recurringRevenue = this.config.recurringRevenue ?? 0;
    return {
      projectId: this.projectId,
      projectName: this.projectName,
      metrics: {
        totalRevenue,
        recurringRevenue,
        transactionCount,
        averageTransactionValue:
          transactionCount > 0
            ? Math.round((totalRevenue / transactionCount) * 100) / 100
            : 0,
        currency,
      },
      live: false,
      capturedAt: new Date().toISOString(),
    };
  }
}
