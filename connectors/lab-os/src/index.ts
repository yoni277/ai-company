import type {
  DataConnector,
  MetricInput,
  OpportunityCandidate,
  ProjectStatusSnapshot,
  RiskCandidate,
} from '@ai-company/shared-types';

export class LabOsConnector implements DataConnector {
  readonly name = 'lab-os';
  readonly projectSlug = 'lab-os';
  readonly displayName = 'Lab-OS';

  async getStatus(): Promise<ProjectStatusSnapshot> {
    return {
      health: 'at_risk',
      headline: 'Pilot deployment slipping vs plan; one customer renegotiating scope.',
      detail: 'P1 customer escalation open since 5 days ago.',
      asOf: new Date().toISOString(),
    };
  }

  async getMetrics(): Promise<MetricInput[]> {
    return [
      { name: 'active_labs', value: 4, unit: 'count' },
      { name: 'paying_customers', value: 2, unit: 'count' },
      { name: 'pilot_customers', value: 3, unit: 'count' },
      { name: 'mrr', value: 9400, unit: 'USD' },
      { name: 'p1_incidents_open', value: 1, unit: 'count' },
      { name: 'avg_sample_throughput', value: 312, unit: 'samples/day' },
    ];
  }

  async getRisks(): Promise<RiskCandidate[]> {
    return [
      {
        severity: 'high',
        description:
          'Lead pilot customer has signaled they may not convert without LIMS integration by end of quarter.',
      },
      {
        severity: 'medium',
        description: 'Backend ingestion queue p99 latency rising 14% week-over-week; not yet user-visible.',
      },
    ];
  }

  async getOpportunities(): Promise<OpportunityCandidate[]> {
    return [
      {
        priority: 'medium',
        description:
          'Two academic labs requested trial access this week — possible expansion into research segment.',
      },
    ];
  }
}
