export const cooOutputSchemaText = `
interface CooOutput {
  headline: string;
  operationsHealth: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
  perProjectOperations: Array<{
    projectSlug: string;
    health: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
    summary: string;                  // 1-2 sentences, operations lens
    operationalMetrics: Array<{
      kind: 'throughput' | 'sla' | 'queue' | 'utilization' | 'vendor';
      name: string;
      value: number;
      unit?: string;
      slaTarget?: number;             // include only if known
      commentary?: string;
    }>;
  }>;
  bottlenecks: Array<{
    projectSlug: string;
    title: string;                    // short, scannable
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendedAction: string;
  }>;
  vendorHealth: Array<{
    projectSlug: string;
    vendor: string;                   // e.g. "Meta WhatsApp Cloud API"
    status: 'healthy' | 'at_risk' | 'critical';
    notes: string;
  }>;
  operationalPriorities: Array<{
    rank: number;                     // 1-based
    title: string;
    rationale: string;
  }>;
  // P005 — Directive → Task fan-out. Optional. Include ONLY when responding
  // to a CEO directive. <= 3 entries. Each capabilityRequired is a
  // deterministic capability slug (e.g. 'unblock_vendor_dependency',
  // 'audit_pipeline', 'resolve_queue_backlog'), never a vendor name.
  proposedTasks?: Array<{
    title: string;
    description?: string;
    capabilityRequired: string;
    priority?: 'low' | 'medium' | 'high';
    dueInDays?: number;
  }>;
  generatedAt: string;                // ISO timestamp
}
`.trim();
