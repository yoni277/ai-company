'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Route-segment error boundary. Renders inside the root layout, so the header
 * and primary navigation stay mounted and interactive when a single route
 * fails to load (e.g. a slow/unavailable data dependency returning 503 on the
 * RSC navigation fetch). Without this, a failed route left the App Router in a
 * broken state and *all* soft navigation — including the header — stopped
 * working until a full reload.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console; `digest` correlates with the server-side log line.
    console.error('Route error boundary caught:', error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto mt-16 text-center space-y-4">
      <div className="text-xs uppercase tracking-wide text-rose-400">
        Something went wrong
      </div>
      <h1 className="text-xl font-semibold text-slate-100">This view failed to load</h1>
      <p className="text-sm text-slate-400">
        The page could not be rendered — usually a slow or failed data request. The rest of
        the dashboard still works; use the navigation above, or retry this view.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-600">Reference: {error.digest}</p>
      )}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm rounded-md bg-slate-800 text-slate-100 hover:bg-slate-700 transition"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-4 py-2 text-sm rounded-md border border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 transition"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
