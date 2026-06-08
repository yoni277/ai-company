/**
 * D061 / P056.2.9 — AIChiefOfStaffPanel  [DERIVED]  · FOUNDATION-TIER
 *
 * The persistent plain-language briefing. Per the locked contract it is DERIVED
 * — composed from existing reads (directives + decisions + risks + tasks +
 * report summaries), no new endpoint. This is the foundation-tier primitive the
 * Home "Executive Briefing" composes (P056.3.1); it is presentation only and
 * takes an already-assembled briefing.
 *
 * Composes StatusBadge (signals) + ActionButton (a single primary call-to-action)
 * and accepts a `children` slot so the screen can embed the most urgent
 * DecisionCard directly inside the briefing.
 */

import type { ReactNode } from 'react';
import { ActionButton } from './ActionButton';
import { StatusBadge, type HealthState } from './StatusBadge';
import { SparkIcon } from './icons';

export interface BriefingSignal {
  state: HealthState;
  /** e.g. "3 decisions waiting", "1 critical risk", "5 healthy projects". */
  text: string;
}

export interface BriefingMetric {
  label: string;
  value: ReactNode;
}

export function AIChiefOfStaffPanel({
  executiveName = 'AI Chief of Staff',
  headline,
  summary,
  signals = [],
  metrics = [],
  generatedAt,
  primaryActionLabel,
  onPrimaryAction,
  children,
}: {
  executiveName?: string;
  /** Short plain-language headline, e.g. "Two decisions need you this morning." */
  headline: string;
  /** The briefing paragraph. */
  summary: string;
  signals?: BriefingSignal[];
  metrics?: BriefingMetric[];
  generatedAt?: string | undefined;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label="Executive briefing"
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-ambient"
    >
      <header className="flex items-start justify-between gap-md">
        <div className="flex min-w-0 items-center gap-sm">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
            <SparkIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm uppercase text-outline">{executiveName}</p>
            <h2 className="font-headline-md text-headline-md text-on-surface">{headline}</h2>
          </div>
        </div>
        {generatedAt ? (
          <span className="shrink-0 font-label-sm text-label-sm text-outline">{generatedAt}</span>
        ) : null}
      </header>

      <p className="mt-md font-body-lg text-body-lg text-on-surface-variant">{summary}</p>

      {signals.length > 0 ? (
        <ul className="mt-md flex flex-wrap gap-sm">
          {signals.map((s, i) => (
            <li key={`${s.text}-${i}`}>
              <StatusBadge state={s.state} label={s.text} size="sm" />
            </li>
          ))}
        </ul>
      ) : null}

      {metrics.length > 0 ? (
        <dl className="mt-md grid grid-cols-2 gap-md sm:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg bg-surface-container-low p-md">
              <dt className="font-label-sm text-label-sm uppercase text-outline">{m.label}</dt>
              <dd className="mt-xs font-headline-md text-headline-md text-on-surface">{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {children ? <div className="mt-md">{children}</div> : null}

      {onPrimaryAction && primaryActionLabel ? (
        <div className="mt-md">
          <ActionButton variant="primary" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </ActionButton>
        </div>
      ) : null}
    </section>
  );
}
