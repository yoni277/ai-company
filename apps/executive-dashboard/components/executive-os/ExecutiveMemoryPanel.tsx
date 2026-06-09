'use client';

/**
 * L31 — Executive Memory panel (spec §3). The CEO sets/edits the persisted
 * narrative (strategy + assumptions) an executive holds for THIS business.
 * Derived projections (risks/decisions/outputs) are read live elsewhere — never
 * duplicated here. Save → PUT /api/ceo/executives/[id]/memory → refresh.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionButton, DataTag } from '../ds';

export function ExecutiveMemoryPanel({
  executiveId,
  projectSlug,
  strategy,
  assumptions,
  updatedAt,
}: {
  executiveId: string;
  projectSlug: string;
  strategy: string | null;
  assumptions: unknown[];
  updatedAt: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [strat, setStrat] = useState(strategy ?? '');
  const initialAssumptions = assumptions
    .map((a) => (typeof a === 'string' ? a : typeof a === 'object' && a && 'assumption' in a ? String((a as { assumption: unknown }).assumption) : JSON.stringify(a)))
    .join('\n');
  const [assumeText, setAssumeText] = useState(initialAssumptions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const known_assumptions = assumeText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((assumption) => ({ assumption }));
      const res = await fetch(`/api/ceo/executives/${executiveId}/memory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_slug: projectSlug, current_strategy: strat.trim() || null, known_assumptions }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `save failed (${res.status})`);
      }
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setBusy(false);
    }
  }

  const assumptionList = initialAssumptions.split('\n').filter(Boolean);

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-lg">
      <div className="mb-sm flex items-center justify-between gap-sm">
        <h3 className="font-title-lg text-title-lg font-bold text-on-surface">Memory</h3>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="min-h-11 font-label-md text-label-md text-primary hover:underline">
            Edit
          </button>
        ) : null}
      </div>

      {!editing ? (
        <>
          <p className="font-label-sm text-label-sm uppercase text-outline">Current strategy</p>
          <p className="mt-xs font-body-md text-body-md text-on-surface">
            {strategy ? strategy : <span className="italic text-on-surface-variant">Not set — click Edit to define.</span>}
          </p>
          <p className="mt-md font-label-sm text-label-sm uppercase text-outline">Known assumptions</p>
          {assumptionList.length === 0 ? (
            <p className="mt-xs font-body-md text-body-md italic text-on-surface-variant">None recorded.</p>
          ) : (
            <ul className="mt-xs space-y-xs">
              {assumptionList.map((a, i) => (
                <li key={i} className="flex items-start gap-sm font-body-md text-body-md text-on-surface">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {a}
                </li>
              ))}
            </ul>
          )}
          {updatedAt ? <p className="mt-md font-label-sm text-label-sm text-outline">Updated {updatedAt.slice(0, 10)} by ceo</p> : null}
        </>
      ) : (
        <div className="space-y-md">
          <div>
            <label htmlFor="mem-strat" className="block font-label-md text-label-md text-on-surface">Current strategy</label>
            <textarea id="mem-strat" rows={3} value={strat} disabled={busy} onChange={(e) => setStrat(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="mem-assume" className="block font-label-md text-label-md text-on-surface">Known assumptions</label>
            <p className="mb-xs font-label-sm text-label-sm text-outline">One per line.</p>
            <textarea id="mem-assume" rows={4} value={assumeText} disabled={busy} onChange={(e) => setAssumeText(e.target.value)} className={inputCls} />
          </div>
          {error ? <p role="alert" className="font-label-md text-label-md text-error">{error}</p> : null}
          <div className="flex items-center justify-between gap-sm">
            <DataTag kind="HAVE" />
            <div className="flex gap-sm">
              <ActionButton variant="ghost" onClick={() => setEditing(false)} disabled={busy} type="button">Cancel</ActionButton>
              <ActionButton variant="primary" onClick={save} busy={busy} type="button">Save memory</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'mt-xs w-full rounded border border-outline-variant bg-surface-container-lowest px-md py-sm font-body-md text-body-md text-on-surface placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60';
