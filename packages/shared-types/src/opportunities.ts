export type OpportunityPriority = 'low' | 'medium' | 'high';

export interface Opportunity {
  id: string;
  projectId: string;
  priority: OpportunityPriority;
  description: string;
  source: string;
  createdAt: string;
  /** P006A — provenance: actor/connector that recorded this row. */
  recordedBy: string;
  /**
   * P006A — fingerprint key for idempotent upsert:
   *   sha256(project_id|recorded_by|priority|normalize(description))
   * Same opportunity re-detected bumps generation instead of duplicating.
   */
  fingerprint: string;
  /** P006A — count of times this opportunity has been re-detected. Starts at 1. */
  generation: number;
}

export interface OpportunityCandidate {
  priority: OpportunityPriority;
  description: string;
}
