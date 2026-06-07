export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'open' | 'monitoring' | 'mitigated' | 'accepted';

export interface Risk {
  id: string;
  projectId: string;
  severity: RiskSeverity;
  description: string;
  source: string;
  status: RiskStatus;
  createdAt: string;
  /** P006A — provenance: actor/connector that recorded this row. */
  recordedBy: string;
  /**
   * P006A — fingerprint key for idempotent upsert:
   *   sha256(project_id|recorded_by|severity|normalize(description))
   * Same risk re-detected on subsequent syncs bumps generation instead
   * of inserting a duplicate.
   */
  fingerprint: string;
  /** P006A — count of times this risk has been re-detected. Starts at 1. */
  generation: number;
}

export interface RiskCandidate {
  severity: RiskSeverity;
  description: string;
}
