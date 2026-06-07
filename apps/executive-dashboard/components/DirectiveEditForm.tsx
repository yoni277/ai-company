'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CEODirective,
  ExecutiveId,
  UpdateCEODirectiveInput,
} from '@ai-company/shared-types';

const ALL_EXECUTIVES: { id: ExecutiveId; label: string }[] = [
  { id: 'chief-of-staff', label: 'Chief of Staff' },
  { id: 'cto', label: 'CTO' },
  { id: 'coo', label: 'COO' },
  { id: 'cfo', label: 'CFO' },
  { id: 'vp-marketing', label: 'VP Marketing' },
  { id: 'vp-sales', label: 'VP Sales' },
];

export function DirectiveEditForm({ directive }: { directive: CEODirective }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(directive.title);
  const [body, setBody] = useState(directive.directive);
  const [category, setCategory] = useState(directive.category);
  const [priority, setPriority] = useState(directive.priority);
  const [expiresAt, setExpiresAt] = useState(directive.expiresAt ?? '');
  const [responders, setResponders] = useState<ExecutiveId[]>(
    directive.respondingExecutives,
  );

  function toggle(exec: ExecutiveId) {
    setResponders((cur) =>
      cur.includes(exec) ? cur.filter((x) => x !== exec) : [...cur, exec],
    );
  }

  async function save() {
    setError(null);
    const patch: UpdateCEODirectiveInput = {};
    if (title !== directive.title) patch.title = title;
    if (body !== directive.directive) patch.directive = body;
    if (category !== directive.category) patch.category = category;
    if (priority !== directive.priority) patch.priority = priority;
    if ((expiresAt || null) !== directive.expiresAt) {
      patch.expiresAt = expiresAt ? expiresAt : null;
    }
    const sameResponders =
      responders.length === directive.respondingExecutives.length &&
      responders.every((x) => directive.respondingExecutives.includes(x));
    if (!sameResponders) patch.respondingExecutives = responders;

    if (Object.keys(patch).length === 0) {
      setOpen(false);
      return;
    }

    try {
      const res = await fetch(`/api/ceo/directives/${directive.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function deactivate() {
    setError(null);
    try {
      const res = await fetch(`/api/ceo/directives/${directive.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800"
        >
          Edit
        </button>
        {directive.active && (
          <button
            onClick={deactivate}
            disabled={pending}
            className="px-3 py-1.5 text-sm rounded-md border border-rose-700/40 text-rose-300 hover:bg-rose-900/30 disabled:opacity-50"
          >
            Deactivate
          </button>
        )}
        {error && <span className="text-xs text-rose-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="border border-slate-800 rounded-md p-4 space-y-3 bg-slate-900/40">
      <label className="block text-xs text-slate-400">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-sm text-slate-100"
        />
      </label>
      <label className="block text-xs text-slate-400">
        Directive
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="mt-1 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-sm text-slate-100"
        />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="block text-xs text-slate-400">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-sm text-slate-100"
          >
            {['strategy', 'product', 'growth', 'operations', 'finance', 'people', 'override'].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-sm text-slate-100"
          >
            {['P0', 'P1', 'P2', 'P3'].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Expires (YYYY-MM-DD)
          <input
            value={expiresAt ?? ''}
            placeholder="optional"
            onChange={(e) => setExpiresAt(e.target.value)}
            className="mt-1 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-sm text-slate-100"
          />
        </label>
      </div>
      <fieldset className="text-xs text-slate-400">
        Responding executives
        <div className="mt-1 flex flex-wrap gap-2">
          {ALL_EXECUTIVES.map((e) => (
            <label
              key={e.id}
              className={`px-2 py-1 rounded border cursor-pointer ${
                responders.includes(e.id)
                  ? 'bg-sky-500/15 text-sky-200 border-sky-500/40'
                  : 'border-slate-700 text-slate-400'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={responders.includes(e.id)}
                onChange={() => toggle(e.id)}
              />
              {e.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={pending}
          className="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save & re-run executives'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-rose-400">{error}</span>}
      </div>
    </div>
  );
}
