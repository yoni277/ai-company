'use client';

/**
 * L31 — "Request Report" (spec §5). Reuses the directive path for a SINGLE
 * executive: a directive whose only responder is this exec → it produces an
 * executive_report (the existing fan-out spine). One click; no new machinery.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionButton } from '../ds';

export function RequestReportButton({
  executiveId,
  executiveName,
  projectSlug,
}: {
  executiveId: string;
  executiveName: string;
  projectSlug: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ceo/directives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Status report — ${executiveName} (${projectSlug})`,
          directive: `Produce a current status report for ${projectSlug}: what's working, what's blocked, and your top recommendation.`,
          category: 'strategy',
          priority: 'P2',
          respondingExecutives: [executiveId],
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `request failed (${res.status})`);
      }
      const { directive } = (await res.json()) as { directive: { id: string } };
      await fetch(`/api/ceo/directives/${directive.id}/run-pending`, { method: 'POST' }).catch(() => {});
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start">
      <ActionButton variant="secondary" onClick={request} busy={busy}>
        Request Report
      </ActionButton>
      {error ? <p role="alert" className="mt-xs font-label-sm text-label-sm text-error">{error}</p> : null}
    </div>
  );
}
