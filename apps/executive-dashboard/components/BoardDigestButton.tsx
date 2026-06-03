'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function BoardDigestButton({
  reportType,
  label,
}: {
  reportType: 'daily_briefing' | 'weekly_report';
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    try {
      const res = await fetch('/api/executive-team/digest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reportType }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      }
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
        className="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
      >
        {pending ? 'Synthesizing…' : label}
      </button>
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </div>
  );
}
