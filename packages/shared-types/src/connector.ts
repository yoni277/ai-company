import type { ProjectStatusSnapshot } from './projects';
import type { MetricInput } from './metrics';
import type { RiskCandidate } from './risks';
import type { OpportunityCandidate } from './opportunities';

export interface ConnectorHealth {
  status: 'ok' | 'degraded' | 'error';
  message?: string;
}

/**
 * Contract every project integration must implement.
 *
 * Connectors return *candidates* — the framework decides whether they become persisted rows.
 */
export interface DataConnector {
  readonly name: string;
  readonly projectSlug: string;
  readonly displayName: string;

  getStatus(): Promise<ProjectStatusSnapshot>;
  getMetrics(): Promise<MetricInput[]>;
  getRisks(): Promise<RiskCandidate[]>;
  getOpportunities?(): Promise<OpportunityCandidate[]>;
  healthCheck?(): Promise<ConnectorHealth>;
}
