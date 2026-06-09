'use client';

/**
 * L30 — per-decision CEO Approve/Reject (spec §10). Calls
 * POST /api/ceo/meetings/[id]/approve which writes ceo_decisions and flips the
 * decision's assigned_work proposed→approved (or rejected) — the single
 * side-effect gate. Refreshes the server detail on success.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ActionButton } from '../ds';

export function MeetingApprovalControls({
  meetingId,
  decisionIndex,
}: {
  meetingId: string;
  decisionIndex: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(verdict: 'approve' | 'reject') {
    setError(null);
    setBusy(verdict);
    try {
      const res = await fetch(`/api/ceo/meetings/${meetingId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions: [{ index: decisionIndex, verdict }] }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `request failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-md">
      <div className="flex flex-wrap gap-sm">
        <ActionButton variant="primary" onClick={() => decide('approve')} busy={busy === 'approve'} disabled={busy != null}>
          Approve
        </ActionButton>
        <ActionButton variant="secondary" onClick={() => decide('reject')} busy={busy === 'reject'} disabled={busy != null}>
          Reject
        </ActionButton>
      </div>
      {error ? <p role="alert" className="mt-xs font-label-sm text-label-sm text-error">{error}</p> : null}
    </div>
  );
}
