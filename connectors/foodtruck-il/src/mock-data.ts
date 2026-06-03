import type {
  MetricInput,
  OpportunityCandidate,
  ProjectStatusSnapshot,
  RiskCandidate,
} from '@ai-company/shared-types';

/**
 * Fallback dataset used when the connector is constructed without Supabase credentials.
 * Keeps the dashboard demoable in mock mode.
 */
export function mockSnapshot(): ProjectStatusSnapshot {
  return {
    health: 'healthy',
    headline: 'Operations nominal across all active trucks.',
    detail: '12 trucks live, 0 outages in last 24h.',
    asOf: new Date().toISOString(),
  };
}

export function mockMetrics(): MetricInput[] {
  return [
    { name: 'active_trucks', value: 12, unit: 'count' },
    { name: 'daily_revenue', value: 38420, unit: 'ILS' },
    { name: 'orders_per_truck', value: 47, unit: 'count' },
    { name: 'avg_ticket_size', value: 68, unit: 'ILS' },
    { name: 'on_time_dispatch_rate', value: 0.94, unit: 'ratio' },
  ];
}

export function mockRisks(): RiskCandidate[] {
  return [
    {
      severity: 'medium',
      description:
        'Driver retention dipped to 81% over last 30 days — two senior operators flagged as flight risks.',
    },
  ];
}

export function mockOpportunities(): OpportunityCandidate[] {
  return [
    {
      priority: 'high',
      description:
        'Tel Aviv lunch slots show +28% YoY demand; one additional truck on Rothschild route projected to add ~6k ILS/day.',
    },
    {
      priority: 'medium',
      description:
        'Partner with Wolt for delivery slots after 22:00; current cutoff misses late demand.',
    },
  ];
}
