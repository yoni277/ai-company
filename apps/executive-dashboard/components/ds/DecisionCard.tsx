/**
 * D061 / P056.2.5 — DecisionCard  [HAVE]  (+ component-library catalog entry, D062 #1)
 *
 * The CEO's atomic governance unit: one decision = one approve/reject record.
 * Backs both surfaces in the locked contract — a `ceo_decisions` row (read via
 * GET /api/ceo/decisions) and a pending `task_proposals` row (read via the
 * deferred P056-RT-1 route). The screen normalizes either entity into these
 * presentational props; this card never fetches.
 *
 * Mutations are the caller's: pass onApprove / onReject / onClarify and the card
 * renders the 1-click controls (ActionButton). Per Chief Architect there is NO
 * bulk path — every card is one decision. Composes StatusBadge + ActionButton.
 *
 * ── Component-library catalog entry ──────────────────────────────────────────
 *  Props:   title (req) · description · priority (P0–P2) · status · dueDate ·
 *           source ('decision'|'proposal') · provenance · on{Approve,Reject,
 *           Clarify} · busy
 *  States:  read-only (no handlers) · actionable (handlers) · busy (per-action
 *           spinner, all controls disabled) · proposal vs decision (source chip)
 *  Data:    HAVE — ceo_decisions + task_proposals
 */

import { Surface } from './Surface';
import { ActionButton } from './ActionButton';
import { DataTag, type DataProvenance } from './StatusBadge';

type BusyAction = 'approve' | 'reject' | 'clarify';

const PRIORITY_TONE: Record<string, string> = {
  P0: 'bg-action/10 text-action border-action/30',
  P1: 'bg-attention/10 text-attention border-attention/30',
  P2: 'bg-surface-container text-on-surface-variant border-outline-variant',
};

export interface DecisionCardProps {
  title: string;
  description?: string | null;
  /** P0 / P1 / P2 (free-form tolerated; unknown falls back to neutral tone). */
  priority?: string | null;
  status?: string | null;
  dueDate?: string | null;
  source?: 'decision' | 'proposal';
  provenance?: DataProvenance;
  onApprove?: () => void;
  onReject?: () => void;
  onClarify?: () => void;
  busy?: BusyAction | null;
  approveLabel?: string;
  rejectLabel?: string;
  clarifyLabel?: string;
}

export function DecisionCard({
  title,
  description,
  priority,
  status,
  dueDate,
  source = 'decision',
  provenance = 'HAVE',
  onApprove,
  onReject,
  onClarify,
  busy = null,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  clarifyLabel = 'Request Clarification',
}: DecisionCardProps) {
  const hasActions = Boolean(onApprove || onReject || onClarify);
  const priorityTone =
    (priority && PRIORITY_TONE[priority]) ?? PRIORITY_TONE.P2;

  return (
    <Surface as="article" interactive>
      <header className="flex items-start justify-between gap-md">
        <div className="min-w-0">
          <div className="mb-xs flex flex-wrap items-center gap-sm">
            {priority ? (
              <span
                className={`inline-flex items-center rounded-sm border px-sm py-[2px] font-label-sm text-label-sm ${priorityTone}`}
              >
                {priority}
              </span>
            ) : null}
            <span className="font-label-sm text-label-sm uppercase text-outline">
              {source === 'proposal' ? 'Proposed task' : 'Decision'}
            </span>
            {status ? (
              <span className="font-label-sm text-label-sm text-on-surface-variant">· {status}</span>
            ) : null}
          </div>
          <h3 className="font-title-lg text-title-lg text-on-surface">{title}</h3>
        </div>
        <DataTag kind={provenance} />
      </header>

      {description ? (
        <p className="mt-sm border-s-4 border-primary ps-md font-body-md text-body-md text-on-surface-variant">
          {description}
        </p>
      ) : null}

      {dueDate ? (
        <p className="mt-sm font-label-sm text-label-sm text-outline">Due {dueDate}</p>
      ) : null}

      {hasActions ? (
        <div className="mt-md flex flex-wrap gap-sm">
          {onApprove ? (
            <ActionButton
              variant="primary"
              onClick={onApprove}
              busy={busy === 'approve'}
              disabled={busy != null && busy !== 'approve'}
            >
              {approveLabel}
            </ActionButton>
          ) : null}
          {onReject ? (
            <ActionButton
              variant="secondary"
              onClick={onReject}
              busy={busy === 'reject'}
              disabled={busy != null && busy !== 'reject'}
            >
              {rejectLabel}
            </ActionButton>
          ) : null}
          {onClarify ? (
            <ActionButton
              variant="ghost"
              onClick={onClarify}
              busy={busy === 'clarify'}
              disabled={busy != null && busy !== 'clarify'}
            >
              {clarifyLabel}
            </ActionButton>
          ) : null}
        </div>
      ) : null}
    </Surface>
  );
}
