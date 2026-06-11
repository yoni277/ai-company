'use client';

/**
 * D086 Phase 1 (T1.2) — LineageThread: the canonical, generic, read-only
 * visualization of a communication's lineage. Works for any source type. A
 * broken conversion is STATED (color + icon + text + a11y), never inferred.
 * Trust affordances (Gemini F3/F5): every synthesized claim carries an evidence
 * chip linking the raw item; a "show raw" disclosure is always present; no
 * synthesis on trivial/binary rows (the provider returns bottleneck=null there).
 *
 * Presentation only — consumes a provider result. RTL-safe: CSS logical
 * properties, inner dir="ltr" on Latin/numeric tokens, mirrored chevrons.
 */
import { useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '../../ds/StatusBadge';
import { useTheme } from '../../theme-provider';
import type { CommunicationTimeline, LineageStage } from '../../../lib/executive-os/communication-timeline-core';
import { L, pick, stageHealth } from './labels';

function StageRow({ stage, he }: { stage: LineageStage; he: boolean }) {
  const [rawOpen, setRawOpen] = useState(false);
  if (stage.status === 'not_applicable') return null;

  const health = stageHealth(stage.status);
  const broken = stage.status === 'gap' || stage.status === 'error';

  return (
    <li
      className={`border-s-2 ps-md ${broken ? 'border-action' : 'border-outline-variant'}`}
    >
      <div className="flex items-center gap-sm">
        <StatusBadge state={health} label={pick(stage.label, he)} size="sm" />
        <span className="font-label-sm text-label-sm text-on-surface-variant" dir="ltr">
          {stage.count}
        </span>
        {broken ? (
          <span className="font-label-sm text-label-sm font-semibold text-action">
            {pick(L.gap, he)}
          </span>
        ) : null}
      </div>

      {/* Per-stage statement (gap / error text) — explicit, not inferred. */}
      {stage.note ? (
        <p className="mt-xs font-body-md text-body-md text-action">{pick(stage.note, he)}</p>
      ) : null}

      {/* Items: each carries an evidence chip to the raw record where one exists. */}
      {stage.items.length > 0 ? (
        <ul className="mt-xs space-y-xs">
          {stage.items.map((it) => (
            <li key={it.id} className="flex items-start gap-sm">
              <span className="min-w-0 flex-1 truncate font-body-md text-body-md text-on-surface">
                {it.who ? (
                  <span className="font-semibold text-on-surface-variant">{it.who} · </span>
                ) : null}
                {it.title}
              </span>
              {it.when ? (
                <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant" dir="ltr">
                  {it.when.slice(0, 10)}
                </span>
              ) : null}
              {it.href ? (
                <Link
                  href={it.href as never}
                  prefetch={false}
                  className="shrink-0 font-label-sm text-label-sm text-primary hover:underline"
                >
                  {pick(L.evidence, he)} ↗
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {/* "show raw" disclosure is always present for items (trust affordance). */}
      {stage.items.length > 0 ? (
        <button
          type="button"
          onClick={() => setRawOpen((v) => !v)}
          className="mt-xs font-label-sm text-label-sm text-on-surface-variant hover:underline"
        >
          {rawOpen ? pick(L.hideRaw, he) : pick(L.showRaw, he)}
        </button>
      ) : null}
      {rawOpen ? (
        <pre
          dir="ltr"
          className="mt-xs overflow-x-auto rounded-md bg-surface-container p-sm font-label-sm text-label-sm text-on-surface-variant"
        >
          {JSON.stringify(stage.items, null, 2)}
        </pre>
      ) : null}
    </li>
  );
}

export function LineageThread({ timeline }: { timeline: CommunicationTimeline }) {
  const { locale } = useTheme();
  const he = locale === 'he';

  return (
    <div>
      {timeline.bottleneck ? (
        <p className="mb-sm rounded-md border border-action/40 bg-action/5 p-sm font-body-md text-body-md text-action">
          {pick(timeline.bottleneck, he)}
        </p>
      ) : !timeline.hasGap ? (
        <p className="mb-sm font-body-md text-body-md text-on-surface-variant">{pick(L.onTrack, he)}</p>
      ) : null}

      <ul className="space-y-md">
        {timeline.stages.map((s) => (
          <StageRow key={s.key} stage={s} he={he} />
        ))}
      </ul>
    </div>
  );
}
