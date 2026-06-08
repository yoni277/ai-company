'use client';

/**
 * D061 / P056.4.6 — Lazy detail-on-expand.
 *
 * Keeps the Inbox initial render light: the summary is always shown; the detail
 * children mount only after the operator expands (no all-data-on-load). A11y:
 * native <details>/<summary> gives keyboard + screen-reader disclosure for free;
 * we only style it.
 */

import type { ReactNode } from 'react';

export function ExpandableDetail({
  label = 'Show detail',
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <details className="mt-sm group">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center font-label-md text-label-md text-primary marker:hidden hover:underline">
        <span className="group-open:hidden">{label}</span>
        <span className="hidden group-open:inline">Hide detail</span>
      </summary>
      <div className="mt-sm">{children}</div>
    </details>
  );
}
