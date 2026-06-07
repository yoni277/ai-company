'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Triggers POST /api/ceo/directives/:id/run-pending and refreshes the page
 * when it returns. The endpoint is long-running (~30–120s) since it holds
 * the response open until every queued executive has either written its
 * report or errored.
 */
export function RunPendingButton({
  directiveId,
  pendingCount,
}: {
  directiveId: string;
  pendingCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [drainInFlight, setDrainInFlight] = useState(false);

  async function run() {
    setError(null);
    setDrainInFlight(true);
    try {
      const res = await fetch(`/api/ceo/directives/${directiveId}/run-pending`, {
        method: 'POST',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDrainInFlight(false);
    }
  }

  if (pendingCount === 0 && !drainInFlight) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={drainInFlight || pending}
        className="px-3 py-1.5 text-sm rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white"
      >
        {drainInFlight
          ? `Running ${pendingCount} executive${pendingCount === 1 ? '' : 's'}… (up to 2 min)`
          : `Run pending (${pendingCount})`}
      </button>
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </div>
  );
}
