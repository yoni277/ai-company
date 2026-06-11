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
 *
 * Approve-flow operability: promoting a proposal whose directive has no
 * objective returns 422 { code:'NO_OBJECTIVE', directiveId }. Instead of
 * dead-ending on the raw error, we surface the SAME recovery the directive page
 * offers (the "Needs objective assignment" affordance, backed by
 * PATCH /api/ceo/directives/[id]) inline at the point of failure: pick an
 * objective (or deep-link to the directive), assign it, and retry the promote.
 */

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DecisionCard } from '../ds';
import type { QueueItem } from '../../lib/executive-os';

type Action = 'approve' | 'reject' | 'clarify';

export function DecisionQueueItem({ item }: { item: QueueItem }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set when promote 422s on a missing objective — drives the inline recovery.
  const [needsObjective, setNeedsObjective] = useState<{ directiveId: string } | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function run(action: Action) {
    setError(null);
    setNeedsObjective(null);
    setBusy(action);
    try {
      const res = await request(item, action);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
          directiveId?: string;
        };
        // Recoverable: the proposal's directive has no objective. Offer the fix
        // inline rather than surfacing a dead-end error.
        if (res.status === 422 && body.code === 'NO_OBJECTIVE' && item.kind === 'proposal') {
          const directiveId = body.directiveId ?? item.directiveId;
          if (directiveId) {
            setNeedsObjective({ directiveId });
            return;
          }
        }
        throw new Error(body.error ?? `request failed (${res.status})`);
      }
      refresh();
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
      {needsObjective ? (
        <ObjectiveRecovery
          proposalId={item.id}
          directiveId={needsObjective.directiveId}
          onResolved={refresh}
          onDismiss={() => setNeedsObjective(null)}
        />
      ) : null}
      {error ? (
        <p role="alert" className="mt-xs font-label-sm text-label-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface ObjectiveOption {
  id: string;
  title: string;
}

/**
 * Inline recovery for a NO_OBJECTIVE promote failure. Reuses the existing
 * directive objective path (PATCH /api/ceo/directives/[id] { objectiveId }),
 * then retries the promote — so the CEO never leaves the approval surface.
 * Honest empty-state: with no objectives it does NOT fabricate one; it offers
 * the deep-link to the directive where an objective can be created/assigned.
 */
function ObjectiveRecovery({
  proposalId,
  directiveId,
  onResolved,
  onDismiss,
}: {
  proposalId: string;
  directiveId: string;
  onResolved: () => void;
  onDismiss: () => void;
}) {
  const [objectives, setObjectives] = useState<ObjectiveOption[] | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/objectives')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { objectives?: Array<{ id: string; title: string }> };
      })
      .then((data) => {
        if (cancelled) return;
        const opts = (data.objectives ?? []).map((o) => ({ id: o.id, title: o.title }));
        setObjectives(opts);
        if (opts[0]) setSelected(opts[0].id);
      })
      .catch(() => {
        if (!cancelled) setObjectives([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function assignAndRetry() {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      // 1) Assign the objective to the directive (existing, validated path).
      const patch = await fetch(`/api/ceo/directives/${directiveId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ objectiveId: selected }),
      });
      if (!patch.ok) {
        const b = (await patch.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `could not assign objective (${patch.status})`);
      }
      // 2) Retry the promote now that the gate is satisfied.
      const promote = await fetch(`/api/proposals/${proposalId}/promote`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decidedBy: 'ceo' }),
      });
      if (!promote.ok) {
        const b = (await promote.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `promote failed (${promote.status})`);
      }
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'could not assign objective');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-xs rounded-md border border-attention/40 bg-attention/5 p-sm">
      <p className="font-label-md text-label-md text-on-surface">
        Needs an objective before this can become a task.
      </p>
      <p className="mt-[2px] font-label-sm text-label-sm text-on-surface-variant">
        Assign one here and we’ll approve it, or open the directive to manage objectives.
      </p>

      {objectives === null ? (
        <p className="mt-sm font-label-sm text-label-sm text-on-surface-variant">Loading objectives…</p>
      ) : objectives.length > 0 ? (
        <div className="mt-sm flex flex-wrap items-center gap-sm">
          <label className="sr-only" htmlFor={`obj-${proposalId}`}>
            Objective
          </label>
          <select
            id={`obj-${proposalId}`}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="min-h-9 rounded-md border border-outline-variant bg-surface-container-lowest px-sm font-label-sm text-label-sm text-on-surface"
          >
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={assignAndRetry}
            disabled={busy || !selected}
            className="min-h-9 rounded-md bg-primary px-md font-label-sm text-label-sm text-on-primary hover:brightness-95 disabled:opacity-50"
          >
            {busy ? 'Assigning…' : 'Assign objective & approve'}
          </button>
          <DirectiveLink directiveId={directiveId} />
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            className="min-h-9 px-sm font-label-sm text-label-sm text-on-surface-variant hover:underline disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="mt-sm flex flex-wrap items-center gap-sm">
          <span className="font-label-sm text-label-sm text-on-surface-variant">No objectives yet —</span>
          <DirectiveLink directiveId={directiveId} />
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-xs font-label-sm text-label-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function DirectiveLink({ directiveId }: { directiveId: string }) {
  return (
    <Link
      href={`/ceo/directives/${directiveId}` as never}
      prefetch={false}
      className="font-label-sm text-label-sm font-semibold text-primary hover:underline"
    >
      Open directive →
    </Link>
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
