'use client';

import { useState } from 'react';
import type { DailyBrief } from '@ai-company/shared-types';

export function DailyBriefButton({ onBrief }: { onBrief?: (brief: DailyBrief) => void }) {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch('/api/chief-of-staff/daily-brief', { method: 'POST' });
      const data = (await res.json()) as { brief: DailyBrief };
      onBrief?.(data.brief);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={loading}
      className="text-sm px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
    >
      {loading ? 'Generating…' : 'Regenerate CEO brief (LLM)'}
    </button>
  );
}
