import type {
  DataConnector,
  MetricInput,
  OpportunityCandidate,
  ProjectStatusSnapshot,
  RiskCandidate,
} from '@ai-company/shared-types';

export class WhatsAppEngineConnector implements DataConnector {
  readonly name = 'whatsapp-engine';
  readonly projectSlug = 'whatsapp-engine';
  readonly displayName = 'WhatsApp Platform';

  async getStatus(): Promise<ProjectStatusSnapshot> {
    return {
      health: 'healthy',
      headline: 'Messaging volume on plan; Meta API quotas comfortable.',
      asOf: new Date().toISOString(),
    };
  }

  async getMetrics(): Promise<MetricInput[]> {
    return [
      { name: 'active_conversations', value: 4820, unit: 'count' },
      { name: 'messages_sent_24h', value: 188_400, unit: 'count' },
      { name: 'response_rate', value: 0.71, unit: 'ratio' },
      { name: 'meta_quota_utilization', value: 0.43, unit: 'ratio' },
      { name: 'avg_first_response_minutes', value: 4.2, unit: 'min' },
    ];
  }

  async getRisks(): Promise<RiskCandidate[]> {
    return [
      {
        severity: 'low',
        description: 'Template approval backlog with Meta is 5 templates deep; could slow new campaign launch.',
      },
    ];
  }

  async getOpportunities(): Promise<OpportunityCandidate[]> {
    return [
      {
        priority: 'medium',
        description:
          'Two FoodTruck-IL trucks not yet using WhatsApp ordering — pilot suggests +18% conversion when enabled.',
      },
    ];
  }
}
