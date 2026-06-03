import type {
  DataConnector,
  MetricInput,
  OpportunityCandidate,
  ProjectStatusSnapshot,
  RiskCandidate,
} from '@ai-company/shared-types';

/**
 * Mock FoodTruck-IL connector. Phase 1 ships only mock data — replace `data.ts`
 * with a real HTTP client in Phase 2 without touching the framework or dashboard.
 */
export class FoodTruckIlConnector implements DataConnector {
  readonly name = 'foodtruck-il';
  readonly projectSlug = 'foodtruck-il';
  readonly displayName = 'FoodTruck-IL';

  async getStatus(): Promise<ProjectStatusSnapshot> {
    return {
      health: 'healthy',
      headline: 'Operations nominal across all active trucks.',
      detail: '12 trucks live, 0 outages in last 24h.',
      asOf: new Date().toISOString(),
    };
  }

  async getMetrics(): Promise<MetricInput[]> {
    return [
      { name: 'active_trucks', value: 12, unit: 'count' },
      { name: 'daily_revenue', value: 38420, unit: 'ILS' },
      { name: 'orders_per_truck', value: 47, unit: 'count' },
      { name: 'avg_ticket_size', value: 68, unit: 'ILS' },
      { name: 'on_time_dispatch_rate', value: 0.94, unit: 'ratio' },
    ];
  }

  async getRisks(): Promise<RiskCandidate[]> {
    return [
      {
        severity: 'medium',
        description:
          'Driver retention dipped to 81% over last 30 days — two senior operators flagged as flight risks.',
      },
    ];
  }

  async getOpportunities(): Promise<OpportunityCandidate[]> {
    return [
      {
        priority: 'high',
        description:
          'Tel Aviv lunch slots show +28% YoY demand; one additional truck on Rothschild route projected to add ~6k ILS/day.',
      },
      {
        priority: 'medium',
        description: 'Partner with Wolt for delivery slots after 22:00; current cutoff misses late demand.',
      },
    ];
  }
}
