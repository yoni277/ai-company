'use client';

/**
 * D061 / P056.2.3 — ActivityFeed  [DERIVED]
 *
 * The "Activity Pulse" primitive. Per the locked contract the v1 feed is a
 * client-side union of `created_at` across existing reads (directives,
 * responses, decisions, evidence, outcomes) — a true event stream is a Wave-2
 * NEW-SVC (ticket P056-NS-2). This component is presentation + pagination only;
 * it never fetches — the screen passes the already-unioned, already-sorted items.
 *
 * Summary-First / lazy: renders `pageSize` rows, then a "Show more" control
 * reveals the next page client-side. No all-data-on-load (Home gate).
 */

import { useState } from 'react';
import { ClockIcon } from './icons';
import { StatusBadge, type HealthState } from './StatusBadge';

export interface ActivityItem {
  id: string;
  /** Short kind label, e.g. "Decision", "Outcome", "Directive". */
  kind: string;
  /** Human-readable line. */
  label: string;
  /** ISO timestamp (the unioned created_at). */
  at: string;
  /** Optional project/owner context shown as a muted suffix. */
  context?: string;
  /** Optional health accent (e.g. a risk event). */
  health?: HealthState;
}

function formatWhen(iso: string): string {
  // Deterministic, locale-stable short form — avoids hydration drift from
  // Intl.RelativeTimeFormat against a moving "now".
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

export function ActivityFeed({
  items,
  pageSize = 5,
  emptyLabel = 'No recent activity.',
}: {
  items: ActivityItem[];
  pageSize?: number;
  emptyLabel?: string;
}) {
  const [shown, setShown] = useState(pageSize);

  if (items.length === 0) {
    return (
      <p className="font-body-md text-body-md italic text-on-surface-variant">{emptyLabel}</p>
    );
  }

  const visible = items.slice(0, shown);
  const remaining = items.length - visible.length;

  return (
    <div>
      <ol className="space-y-0">
        {visible.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-sm border-b border-outline-variant py-sm last:border-b-0"
          >
            <ClockIcon className="mt-[2px] h-4 w-4 shrink-0 text-outline" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-sm gap-y-xs">
                <span className="font-label-sm text-label-sm uppercase text-outline">
                  {item.kind}
                </span>
                {item.health ? <StatusBadge state={item.health} size="sm" /> : null}
              </div>
              <p className="font-body-md text-body-md text-on-surface">{item.label}</p>
              <p className="font-label-sm text-label-sm text-outline">
                {formatWhen(item.at)}
                {item.context ? ` · ${item.context}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {remaining > 0 ? (
        <button
          type="button"
          onClick={() => setShown((n) => n + pageSize)}
          className="mt-sm min-h-11 font-label-md text-label-md text-primary hover:underline"
        >
          Show more ({remaining})
        </button>
      ) : null}
    </div>
  );
}
