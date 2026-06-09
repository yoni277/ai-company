'use client';

/**
 * EPIC-004 (WCC) — per-row manage actions, wired to the Step-2 routes over
 * work-control-core. The action shown depends on the row's derived state, so the
 * CEO resolves an item inline ("what needs my action" answered without a click
 * away). The activation gate is honoured in-UI: an approve that comes back 422
 * NEEDS_CEO_COMPLETION reveals the owner+date form instead of failing silently.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ActionButton } from '../../ds/ActionButton';
import { EXECUTIVES, T, tx, type Locale } from './labels';
import type { WorkState } from '../../../lib/executive-os/work-state';

export interface RowActionTarget {
  id: string;
  state: WorkState;
  ownerExecutiveId: string | null;
  dueDate: string | null;
  reviewDate: string | null;
}

export function WorkRowActions({ item, locale }: { item: RowActionTarget; locale: Locale }) {
  const he = locale === 'he';
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(item.state === 'needs_ceo_completion');
  const [owner, setOwner] = useState(item.ownerExecutiveId ?? '');
  const [due, setDue] = useState(item.dueDate ?? '');

  async function call(
    key: string,
    url: string,
    method: 'POST' | 'PATCH',
    body?: Record<string, unknown>,
  ): Promise<boolean> {
    setError(null);
    setBusy(key);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        if (res.status === 422 && b.code === 'NEEDS_CEO_COMPLETION') {
          setShowComplete(true);
          setError(b.error ?? (he ? 'דרושה השלמת מנכ״ל' : 'Needs CEO completion'));
          return false;
        }
        throw new Error(b.error ?? `request failed (${res.status})`);
      }
      startTransition(() => router.refresh());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
      return false;
    } finally {
      setBusy(null);
    }
  }

  const base = `/api/ceo/work/${item.id}`;
  const approve = (body?: Record<string, unknown>) => call('approve', `${base}/approve`, 'POST', body);
  const reject = () => call('reject', `${base}/reject`, 'POST');
  const exec = (to: string) => call(to, `${base}/execution`, 'POST', { to });
  const save = (body: Record<string, unknown>) => call('save', base, 'PATCH', body);

  const errEl = error ? (
    <p role="alert" className="mt-xs font-label-sm text-label-sm text-action">
      {error}
    </p>
  ) : null;

  // Terminal states — nothing to do.
  if (item.state === 'done' || item.state === 'cancelled' || item.state === 'rejected') {
    return <span className="font-label-sm text-label-sm text-on-surface-variant">{tx(T.none, he)}</span>;
  }

  // Awaiting CEO input — the resolution lives in the source artifact (L34).
  if (item.state === 'awaiting_ceo_input') {
    return (
      <span className="font-label-sm text-label-sm text-on-surface-variant">
        {tx(T.act.answerInSource, he)}
      </span>
    );
  }

  // Needs CEO completion / awaiting approval — the approval gate.
  if (item.state === 'needs_ceo_completion' || item.state === 'awaiting_approval' || showComplete) {
    return (
      <div className="flex flex-col gap-xs">
        {showComplete ? (
          <div className="flex flex-wrap items-center gap-xs">
            <label className="sr-only" htmlFor={`owner-${item.id}`}>
              {tx(T.act.owner, he)}
            </label>
            <select
              id={`owner-${item.id}`}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="min-h-9 rounded-md border border-outline-variant bg-surface-container-lowest px-sm font-label-sm text-label-sm"
            >
              <option value="">{tx(T.act.owner, he)}…</option>
              {EXECUTIVES.map((x) => (
                <option key={x.id} value={x.id}>
                  {he ? x.he : x.en}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor={`due-${item.id}`}>
              {tx(T.act.dueDate, he)}
            </label>
            <input
              id={`due-${item.id}`}
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="min-h-9 rounded-md border border-outline-variant bg-surface-container-lowest px-sm font-label-sm text-label-sm"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-xs">
          <ActionButton
            variant="primary"
            busy={busy === 'approve'}
            onClick={() =>
              approve({
                ...(owner ? { ownerExecutiveId: owner } : {}),
                ...(due ? { dueDate: due } : {}),
              })
            }
          >
            {tx(T.act.approve, he)}
          </ActionButton>
          {showComplete ? (
            <ActionButton
              variant="secondary"
              busy={busy === 'save'}
              onClick={() =>
                save({
                  ...(owner ? { ownerExecutiveId: owner } : {}),
                  ...(due ? { dueDate: due } : {}),
                })
              }
            >
              {tx(T.act.save, he)}
            </ActionButton>
          ) : null}
          <ActionButton variant="ghost" busy={busy === 'reject'} onClick={reject}>
            {tx(T.act.reject, he)}
          </ActionButton>
        </div>
        {errEl}
      </div>
    );
  }

  // Approved + live — execution transitions.
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex flex-wrap items-center gap-xs">
        {item.state === 'open' ? (
          <ActionButton variant="primary" busy={busy === 'in_progress'} onClick={() => exec('in_progress')}>
            {tx(T.act.start, he)}
          </ActionButton>
        ) : null}
        {item.state === 'blocked' ? (
          <ActionButton variant="primary" busy={busy === 'in_progress'} onClick={() => exec('in_progress')}>
            {tx(T.act.unblock, he)}
          </ActionButton>
        ) : (
          <ActionButton variant="secondary" busy={busy === 'blocked'} onClick={() => exec('blocked')}>
            {tx(T.act.block, he)}
          </ActionButton>
        )}
        <ActionButton variant="ghost" busy={busy === 'done'} onClick={() => exec('done')}>
          {tx(T.act.done, he)}
        </ActionButton>
      </div>
      {errEl}
    </div>
  );
}
