'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function SyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    try {
      const res = await fetch('/api/connectors/sync', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={pending}
        className="px-3 py-1.5 text-sm rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? 'Syncing…' : 'Sync connectors'}
      </button>
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </div>
  );
}
