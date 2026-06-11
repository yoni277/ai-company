/**
 * OF-011 / D085 item 6 — Fan-out failure banner on the Work Control Center.
 *
 * Lifts errored directive responders into the CEO's primary surface so a failed
 * fan-out target is never silently discarded (the "VP-Marketing errored with no
 * report and no alert" case). Each row drills into the directive detail, where
 * the per-responder error message already lives. Server component — pure render.
 */

import Link from 'next/link';
import type { DirectiveFanoutFailure } from '../../../lib/executive-os/directive-failures-core';

const EXEC_LABEL: Record<string, string> = {
  'chief-of-staff': 'Chief of Staff',
  cto: 'CTO',
  coo: 'COO',
  cfo: 'CFO',
  'vp-marketing': 'VP Marketing',
  'vp-sales': 'VP Sales',
};

export function DirectiveFanoutFailuresBanner({
  failures,
}: {
  failures: DirectiveFanoutFailure[];
}) {
  if (failures.length === 0) return null;

  const totalResponders = failures.reduce((n, f) => n + f.failures.length, 0);

  return (
    <div className="mb-md rounded-md border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
      <div className="font-medium text-rose-200">
        {totalResponders} executive {totalResponders === 1 ? 'response' : 'responses'} failed
        {' '}across {failures.length} active {failures.length === 1 ? 'directive' : 'directives'}
      </div>
      <ul className="mt-2 space-y-2">
        {failures.map((f) => (
          <li key={f.directiveId} className="flex flex-col gap-1">
            <Link
              href={`/ceo/directives/${f.directiveId}` as never}
              prefetch={false}
              className="text-rose-100 hover:underline"
            >
              {f.title} ↗
            </Link>
            <div className="flex flex-wrap gap-1.5">
              {f.failures.map((r) => (
                <span
                  key={r.executiveId}
                  title={r.errorMessage ?? 'Errored without a message.'}
                  className="rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[11px] text-rose-200"
                >
                  {EXEC_LABEL[r.executiveId] ?? r.executiveId}: FAILED
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
