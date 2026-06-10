'use client';

/**
 * OF-008 — Meeting lifecycle control (scheduled → in_discussion → summarized →
 * completed). Gives the CEO the missing affordance: run a scheduled meeting, or
 * RESUME a stalled `in_discussion` one (re-run R4 synthesis from the persisted
 * discussion via /synthesize → drives to `summarized` with the conversion
 * guarantee). A stalled meeting shows a clear "needs your action" state. Approve
 * (close → completed) is the per-decision control; this only advances synthesis.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ActionButton } from '../ds';

export function MeetingLifecycleControls({ meetingId, status }: { meetingId: string; status: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stalled = status === 'in_discussion';
  const fresh = status === 'scheduled' || status === 'open';
  if (!stalled && !fresh) return null; // summarized/completed/approved/cancelled — nothing to advance

  // Stalled → resume (re-synthesize from persisted discussion). Fresh → full run.
  const endpoint = stalled ? 'synthesize' : 'run';
  const label = stalled ? 'Resume & Synthesize' : 'Run Meeting';

  async function advance() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/ceo/meetings/${meetingId}/${endpoint}`, { method: 'POST' });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `request failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-lg border p-md ${
        stalled ? 'border-action/40 bg-action/5' : 'border-outline-variant bg-surface-container-low'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="min-w-0">
          <p className="font-title-sm text-title-sm text-on-surface">
            {stalled ? 'This meeting stalled mid-discussion' : 'Ready to convene'}
          </p>
          <p className="mt-[2px] font-label-sm text-label-sm text-on-surface-variant">
            {stalled
              ? 'Needs your action — resume to run the Chief-of-Staff synthesis and emit proposed work (or an explicit no-action).'
              : 'Run the orchestration (R0–R4) to reach synthesis and proposed work.'}
          </p>
        </div>
        <ActionButton variant="primary" onClick={advance} busy={busy} disabled={busy}>
          {label}
        </ActionButton>
      </div>
      {error ? (
        <p role="alert" className="mt-xs font-label-sm text-label-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
