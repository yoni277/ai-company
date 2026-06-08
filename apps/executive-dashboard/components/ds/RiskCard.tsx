/**
 * D061 / P056.2.7 — RiskCard  [HAVE]
 *
 * A single `risks` row (read via the deferred P056-RT-2 route →
 * repos.risks.listOpen). Likelihood/impact SCORING is a Wave-2 NEW-SVC
 * (ticket P056-NS-1) — this card shows the raw severity the executive recorded,
 * never a fabricated score.
 *
 * Severity maps to the StatusBadge health triad so a critical risk reads the
 * same red/octagon language as an Action-Required project. The raw severity word
 * is still shown alongside the badge (color + icon + text, never color alone).
 */

import type { RiskSeverity } from '@ai-company/shared-types';
import { Surface } from './Surface';
import { ActionButton } from './ActionButton';
import { StatusBadge, DataTag, type HealthState, type DataProvenance } from './StatusBadge';

const SEVERITY_STATE: Record<RiskSeverity, HealthState> = {
  critical: 'action',
  high: 'action',
  medium: 'attention',
  low: 'neutral',
};

export interface RiskCardProps {
  description: string;
  severity: RiskSeverity;
  status?: string;
  /** Provenance — actor/connector that recorded the risk (risks.recordedBy). */
  recordedBy?: string;
  /** Optional project/source context. */
  context?: string | undefined;
  /** Times re-detected (risks.generation); shown only when > 1. */
  generation?: number;
  provenance?: DataProvenance;
  onMitigate?: () => void;
  busy?: boolean;
}

export function RiskCard({
  description,
  severity,
  status,
  recordedBy,
  context,
  generation,
  provenance = 'HAVE',
  onMitigate,
  busy = false,
}: RiskCardProps) {
  return (
    <Surface as="article" interactive>
      <header className="flex items-start justify-between gap-md">
        <div className="flex flex-wrap items-center gap-sm">
          <StatusBadge
            state={SEVERITY_STATE[severity]}
            label={`${severity.charAt(0).toUpperCase()}${severity.slice(1)} risk`}
            size="sm"
          />
          {status ? (
            <span className="font-label-sm text-label-sm uppercase text-outline">{status}</span>
          ) : null}
          {generation && generation > 1 ? (
            <span className="font-label-sm text-label-sm text-outline">
              ×{generation} re-detected
            </span>
          ) : null}
        </div>
        <DataTag kind={provenance} />
      </header>

      <p className="mt-sm font-body-md text-body-md text-on-surface">{description}</p>

      <div className="mt-sm flex flex-wrap items-center gap-x-md gap-y-xs font-label-sm text-label-sm text-outline">
        {context ? <span>{context}</span> : null}
        {recordedBy ? <span>recorded by {recordedBy}</span> : null}
      </div>

      {onMitigate ? (
        <div className="mt-md">
          <ActionButton variant="secondary" onClick={onMitigate} busy={busy}>
            Mark mitigating
          </ActionButton>
        </div>
      ) : null}
    </Surface>
  );
}
