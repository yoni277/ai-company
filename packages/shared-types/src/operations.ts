import type { ProjectHealth } from './projects';
import type { RiskSeverity } from './risks';
import type { TaskProposal } from './doos';

export type OperationalMetricKind = 'throughput' | 'sla' | 'queue' | 'utilization' | 'vendor';
export type VendorStatus = 'healthy' | 'at_risk' | 'critical';

/**
 * The AI COO's structured output. Reads platform state as an operations problem:
 * throughput, SLA adherence, queue health, vendor dependencies, process bottlenecks.
 * Advisory only — never reroutes traffic, pages vendors, or modifies ops systems.
 */
export interface CooOutput {
  headline: string;
  operationsHealth: ProjectHealth;
  perProjectOperations: Array<{
    projectSlug: string;
    health: ProjectHealth;
    summary: string;
    operationalMetrics: Array<{
      kind: OperationalMetricKind;
      name: string;
      value: number;
      unit?: string;
      slaTarget?: number;
      commentary?: string;
    }>;
  }>;
  bottlenecks: Array<{
    projectSlug: string;
    title: string;
    severity: RiskSeverity;
    description: string;
    recommendedAction: string;
  }>;
  vendorHealth: Array<{
    projectSlug: string;
    vendor: string;
    status: VendorStatus;
    notes: string;
  }>;
  operationalPriorities: Array<{
    rank: number;
    title: string;
    rationale: string;
  }>;
  /** P005 — see VpMarketingOutput.proposedTasks for semantics. */
  proposedTasks?: TaskProposal[];
  generatedAt: string;
}
