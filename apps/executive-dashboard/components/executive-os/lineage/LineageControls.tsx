'use client';

/**
 * D086 Phase 1 (T1.3) — one-level expand-in-place control for a list row.
 *
 * Renders a single "Lineage" toggle. On open it LAZY-MOUNTS (and only then
 * fetches) a one-level summary: current stage + the one-line bottleneck + a
 * primary action ("Open in Inspector", where the full thread + reused actions
 * live). No nested expansion here — the full history lives in the Inspector
 * (Gemini F2). Content is not in the DOM until opened, so initial render
 * payloads are unchanged.
 *
 * Drop-in for any row container (td / li / article). Generic across source types.
 */
import { useState } from 'react';
import { useTheme } from '../../theme-provider';
import { useLineage } from './useLineage';
import { useInspect } from './Inspector';
import { L, pick } from './labels';

export function LineageControls({
  type,
  id,
  className = '',
}: {
  type: string;
  id: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { locale } = useTheme();
  const he = locale === 'he';

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-xs font-label-md text-label-md text-primary hover:underline"
      >
        <span aria-hidden="true" className={open ? 'rotate-90 transition' : 'transition'}>
          ▸
        </span>
        {open ? pick(L.hide, he) : pick(L.lineage, he)}
      </button>
      {/* Lazy: the summary only mounts (and fetches) once opened. */}
      {open ? <LineageInline type={type} id={id} he={he} /> : null}
    </div>
  );
}

function LineageInline({ type, id, he }: { type: string; id: string; he: boolean }) {
  const { data, loading, error } = useLineage(type, id);
  const { setInspect } = useInspect();

  if (loading) {
    return <p className="mt-xs font-body-md text-body-md text-on-surface-variant">{pick(L.loading, he)}</p>;
  }
  if (error || !data) {
    return <p className="mt-xs font-body-md text-body-md text-on-surface-variant">{pick(L.error, he)}</p>;
  }

  const t = data.timeline;
  const current = t.stages.find((s) => s.key === t.currentStageKey);

  return (
    <div className="mt-xs space-y-xs rounded-md border border-outline-variant bg-surface-container-lowest p-sm">
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        {pick(L.current, he)}: <span className="text-on-surface">{current ? pick(current.label, he) : '—'}</span>
      </p>
      {/* One-line bottleneck — only when the provider produced one (no synthesis
          on trivial/binary rows). */}
      {t.bottleneck ? (
        <p className="font-body-md text-body-md text-action">{pick(t.bottleneck, he)}</p>
      ) : (
        <p className="font-body-md text-body-md text-on-surface-variant">{pick(L.onTrack, he)}</p>
      )}
      <button
        type="button"
        onClick={() => setInspect(t.sourceType, t.sourceId)}
        className="inline-flex min-h-11 items-center font-label-md text-label-md font-semibold text-primary hover:underline"
      >
        {pick(L.openInspector, he)} →
      </button>
    </div>
  );
}
