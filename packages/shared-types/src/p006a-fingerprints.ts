import { createHash } from 'node:crypto';
import type { OpportunityPriority } from './opportunities';
import type { RiskSeverity } from './risks';

/**
 * P006A — Fingerprint helpers for risks + opportunities.
 *
 * Doctrine (Chief Architect 2026-06-06 Q-A1):
 *   Include connector_name in the fingerprint so the same risk reported
 *   by two different connectors counts as two distinct attestations,
 *   not one merged record. Mirrors the P005A choice where
 *   source_executive_id is in the proposal fingerprint.
 *
 * Both hashes match the SQL backfill in migration 0022 so the
 * application-layer fingerprint and the DB-stored fingerprint converge.
 */

const NORM = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

export function fingerprintRisk(input: {
  projectId: string;
  recordedBy: string;
  severity: RiskSeverity;
  description: string;
}): string {
  const payload = [
    input.projectId,
    input.recordedBy,
    input.severity,
    NORM(input.description),
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

export function fingerprintOpportunity(input: {
  projectId: string;
  recordedBy: string;
  priority: OpportunityPriority;
  description: string;
}): string {
  const payload = [
    input.projectId,
    input.recordedBy,
    input.priority,
    NORM(input.description),
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}
