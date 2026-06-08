/**
 * D061 / P056.2.6 — RecommendationCard  [HAVE]
 *
 * An executive's recommendation, sourced from `executive_reports.body` (read via
 * GET /api/reports) with an evidence-token count (GET /api/tasks/[id]/evidence).
 *
 * Confidence / Historical-ROI is a CONFIRMED NEW-FIELD (no executive emits it
 * today — 05-data-mapping-confirmed.md §2, ticket P056-NF-1). Per the contract
 * the slot is HIDDEN, not zero-filled: the `confidence` / `historicalRoi` props
 * are optional and the metrics row renders ONLY when a value is actually present.
 * When Wave-2 back-fills the field, screens pass it and the slot lights up — no
 * markup change here.
 */

import { Surface } from './Surface';
import { ActionButton } from './ActionButton';
import { DataTag, type DataProvenance } from './StatusBadge';
import { SparkIcon } from './icons';

export interface RecommendationCardProps {
  executiveName: string;
  title: string;
  /** Plain-language recommendation summary (from report body). */
  summary: string;
  evidenceCount?: number;
  /** NEW-FIELD (P056-NF-1) — undefined in Wave 1; slot stays hidden. */
  confidence?: number | null;
  /** NEW-FIELD (P056-NF-1) — undefined in Wave 1; slot stays hidden. */
  historicalRoi?: string | null;
  provenance?: DataProvenance;
  onAccept?: () => void;
  onDismiss?: () => void;
  busy?: 'accept' | 'dismiss' | null;
  acceptLabel?: string;
}

export function RecommendationCard({
  executiveName,
  title,
  summary,
  evidenceCount,
  confidence,
  historicalRoi,
  provenance = 'HAVE',
  onAccept,
  onDismiss,
  busy = null,
  acceptLabel = 'Accept Recommendation',
}: RecommendationCardProps) {
  const hasConfidence = confidence != null;
  const hasRoi = historicalRoi != null && historicalRoi !== '';
  const hasMetrics = hasConfidence || hasRoi;

  return (
    <Surface as="article" interactive>
      <header className="flex items-start justify-between gap-md">
        <div className="flex min-w-0 items-center gap-sm">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-container/20 text-primary">
            <SparkIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm uppercase text-outline">{executiveName}</p>
            <h3 className="font-title-lg text-title-lg text-on-surface">{title}</h3>
          </div>
        </div>
        <DataTag kind={provenance} />
      </header>

      <p className="mt-sm font-body-md text-body-md text-on-surface-variant">{summary}</p>

      {hasMetrics ? (
        <dl className="mt-md flex flex-wrap gap-lg">
          {hasConfidence ? (
            <div>
              <dt className="font-label-sm text-label-sm uppercase text-outline">Confidence</dt>
              <dd className="font-title-lg text-title-lg text-on-surface">
                {Math.round((confidence as number) * 100)}%
              </dd>
            </div>
          ) : null}
          {hasRoi ? (
            <div>
              <dt className="font-label-sm text-label-sm uppercase text-outline">Historical ROI</dt>
              <dd className="font-title-lg text-title-lg text-on-surface">{historicalRoi}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-md flex flex-wrap items-center gap-sm">
        {onAccept ? (
          <ActionButton
            variant="primary"
            onClick={onAccept}
            busy={busy === 'accept'}
            disabled={busy != null && busy !== 'accept'}
          >
            {acceptLabel}
          </ActionButton>
        ) : null}
        {onDismiss ? (
          <ActionButton
            variant="ghost"
            onClick={onDismiss}
            busy={busy === 'dismiss'}
            disabled={busy != null && busy !== 'dismiss'}
          >
            Dismiss
          </ActionButton>
        ) : null}
        {typeof evidenceCount === 'number' ? (
          <span className="ms-auto font-label-sm text-label-sm text-outline">
            {evidenceCount} evidence {evidenceCount === 1 ? 'token' : 'tokens'}
          </span>
        ) : null}
      </div>
    </Surface>
  );
}
