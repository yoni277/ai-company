'use client';

/**
 * EPIC-004 (WCC) — the CEO's lenses. Filters compose and drive the URL search
 * params, so the server component re-reads them and returns project_slug-scoped
 * data (no cross-business bleed — narrowing happens at the DB, not the client).
 * The last selection persists to localStorage and is restored when the page is
 * opened with no query string.
 */

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '../../theme-provider';
import { EXECUTIVES, SOURCE_LABEL, STATE_META, STATE_ORDER, T, tx } from './labels';

const STORE_KEY = 'wcc-filters';

// The filter keys we own in the query string.
const KEYS = [
  'project_slug',
  'owner',
  'source_type',
  'priority',
  'state',
  'waiting_on_ceo',
  'blocked',
  'due_before',
] as const;

export function WorkFilters({ businesses }: { businesses: Array<{ slug: string; name: string }> }) {
  const { locale } = useTheme();
  const he = locale === 'he';
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // Restore last selection from localStorage when opened with no query string.
  useEffect(() => {
    if (sp.toString().length > 0) return;
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved && saved.length > 1) router.replace(`${pathname}?${saved}` as never);
    } catch {
      /* localStorage unavailable — ignore */
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(next: URLSearchParams) {
    const qs = next.toString();
    try {
      localStorage.setItem(STORE_KEY, qs);
    } catch {
      /* ignore */
    }
    router.replace((qs ? `${pathname}?${qs}` : pathname) as never);
  }

  function set(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    commit(next);
  }

  function toggle(key: string, on: boolean) {
    const next = new URLSearchParams(sp.toString());
    if (on) next.set(key, '1');
    else next.delete(key);
    commit(next);
  }

  function clearAll() {
    const next = new URLSearchParams();
    commit(next);
  }

  const val = (k: string) => sp.get(k) ?? '';
  const selectCls =
    'min-h-9 rounded-md border border-outline-variant bg-surface-container-lowest px-sm font-label-sm text-label-sm text-on-surface';
  const anyActive = KEYS.some((k) => sp.get(k));

  return (
    <div className="flex flex-wrap items-end gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-md">
      <Field label={tx(T.filter.business, he)}>
        <select className={selectCls} value={val('project_slug')} onChange={(e) => set('project_slug', e.target.value)}>
          <option value="">{tx(T.filter.all, he)}</option>
          {businesses.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label={tx(T.filter.executive, he)}>
        <select className={selectCls} value={val('owner')} onChange={(e) => set('owner', e.target.value)}>
          <option value="">{tx(T.filter.all, he)}</option>
          {EXECUTIVES.map((x) => (
            <option key={x.id} value={x.id}>
              {he ? x.he : x.en}
            </option>
          ))}
        </select>
      </Field>

      <Field label={tx(T.filter.source, he)}>
        <select className={selectCls} value={val('source_type')} onChange={(e) => set('source_type', e.target.value)}>
          <option value="">{tx(T.filter.all, he)}</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {tx(v, he)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={tx(T.filter.priority, he)}>
        <select className={selectCls} value={val('priority')} onChange={(e) => set('priority', e.target.value)}>
          <option value="">{tx(T.filter.all, he)}</option>
          {['P0', 'P1', 'P2', 'P3'].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>

      <Field label={tx(T.filter.status, he)}>
        <select className={selectCls} value={val('state')} onChange={(e) => set('state', e.target.value)}>
          <option value="">{tx(T.filter.all, he)}</option>
          {STATE_ORDER.map((s) => (
            <option key={s} value={s}>
              {tx(STATE_META[s], he)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={tx(T.filter.dueBefore, he)}>
        <input
          type="date"
          className={selectCls}
          value={val('due_before')}
          onChange={(e) => set('due_before', e.target.value)}
        />
      </Field>

      <label className="inline-flex min-h-9 items-center gap-xs font-label-sm text-label-sm text-on-surface">
        <input type="checkbox" checked={val('waiting_on_ceo') === '1'} onChange={(e) => toggle('waiting_on_ceo', e.target.checked)} />
        {tx(T.filter.waitingOnCeo, he)}
      </label>
      <label className="inline-flex min-h-9 items-center gap-xs font-label-sm text-label-sm text-on-surface">
        <input type="checkbox" checked={val('blocked') === '1'} onChange={(e) => toggle('blocked', e.target.checked)} />
        {tx(T.filter.blocked, he)}
      </label>

      {anyActive ? (
        <button
          type="button"
          onClick={clearAll}
          className="min-h-9 rounded px-sm font-label-sm text-label-sm text-primary hover:underline"
        >
          {tx(T.filter.clear, he)}
        </button>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      {children}
    </div>
  );
}
