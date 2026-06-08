'use client';

/**
 * D061 / P056.3–4 — DecisionQueueItem (wired).
 *
 * Connects the presentational DecisionCard to the verified mutation routes.
 * Mirrors the existing ProposalDecisionButtons pattern (useTransition +
 * router.refresh) so an approval is 1-click and the server component re-runs to
 * drop the item from the queue.
 *
 * Endpoint map (all E2-verified — 05-data-mapping-confirmed.md):
 *   decision  Approve  → PATCH /api/ceo/decisions/[id] { decisionStatus:'approved' }
 *             Reject   → PATCH /api/ceo/decisions/[id] { decisionStatus:'rejected' }
 *             Clarify  → PATCH /api/ceo/decisions/[id] { decisionStatus:'deferred' }
 *   proposal  Approve  → POST  /api/proposals/[id]/promote { decidedBy:'ceo' }
 *             Reject   → POST  /api/proposals/[id]/reject  { decidedBy:'ceo' }
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DecisionCard } from '../ds';
import type { QueueItem } from '../../lib/executive-os';

type Action = 'approve' | 'reject' | 'clarify';

export function DecisionQueueItem({ item }: { item: QueueItem }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: Action) {
    setError(null);
    setBusy(action);
    try {
      const res = await request(item, action);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `request failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <DecisionCard
        title={item.title}
        description={item.description}
        priority={item.priority}
        status={item.status}
        dueDate={item.dueDate}
        source={item.kind}
        onApprove={() => run('approve')}
        onReject={() => run('reject')}
        {...(item.kind === 'decision' ? { onClarify: () => run('clarify') } : {})}
        busy={busy}
      />
      {error ? (
        <p role="alert" className="mt-xs font-label-sm text-label-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

function request(item: QueueItem, action: Action): Promise<Response> {
  if (item.kind === 'decision') {
    const decisionStatus =
      action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'deferred';
    return fetch(`/api/ceo/decisions/${item.id}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ decisionStatus }),
    });
  }

  // proposal
  const path = action === 'approve' ? 'promote' : 'reject';
  return fetch(`/api/proposals/${item.id}/${path}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ decidedBy: 'ceo' }),
  });
}
