'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * P005A — Per-proposal Approve / Reject controls.
 *
 * Per Chief Architect: bulk approval is rejected. Every proposal is one
 * decision, one audit record. These two buttons are the only path that
 * promotes a proposal to a task; no other UI shortcut exists.
 */
export function ProposalDecisionButtons({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function call(action: 'promote' | 'reject') {
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decidedBy: 'ceo' }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `request failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    }
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => call('promote')}
          disabled={pending}
          className="text-xs px-3 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
        >
          Approve → create task
        </button>
        <button
          type="button"
          onClick={() => call('reject')}
          disabled={pending}
          className="text-xs px-3 py-1 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {error && (
        <div className="text-[10px] text-rose-300/90 max-w-[14rem] text-right">{error}</div>
      )}
    </div>
  );
}
