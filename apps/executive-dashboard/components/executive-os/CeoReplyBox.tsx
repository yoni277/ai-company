'use client';

/**
 * OF-005 — the CEO answers an executive's clarifying question in-thread. Shows
 * the original instruction + the executive's question + a reply box → POST
 * /api/ceo/instructions/[id]/respond → the executive continues (the returned
 * response is shown inline; if it asks another question the refresh re-surfaces
 * it). Closes the stall the work order targets. EN/HE.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ActionButton } from '../ds';

const TXT = {
  question: { en: 'Asked you', he: 'שאל אותך' },
  instruction: { en: 'Instruction', he: 'הוראה' },
  placeholder: { en: 'Your reply to the executive…', he: 'התשובה שלך למנהל…' },
  send: { en: 'Send reply', he: 'שליחת תשובה' },
  continued: { en: 'Executive continued', he: 'המנהל המשיך' },
} as const;

export function CeoReplyBox({
  instructionId,
  instruction,
  question,
  he,
}: {
  instructionId: string;
  instruction: string;
  question: string;
  he: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [continued, setContinued] = useState<string | null>(null);
  const t = (p: { en: string; he: string }) => (he ? p.he : p.en);

  async function send() {
    if (!reply.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/ceo/instructions/${instructionId}/respond`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ceoResponse: reply.trim() }),
      });
      const b = (await res.json().catch(() => ({}))) as { error?: string; response?: string };
      if (!res.ok) throw new Error(b.error ?? `request failed (${res.status})`);
      setContinued(b.response ?? '');
      setReply('');
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-attention/40 bg-attention/5 p-sm">
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        {t(TXT.instruction)}: <span className="text-on-surface">{instruction}</span>
      </p>
      <p className="mt-xs font-body-sm text-body-sm text-on-surface">
        <span className="font-label-sm text-label-sm uppercase text-attention">{t(TXT.question)}:</span> {question}
      </p>
      <div className="mt-sm flex flex-col gap-xs">
        <label className="sr-only" htmlFor={`reply-${instructionId}`}>
          {t(TXT.placeholder)}
        </label>
        <textarea
          id={`reply-${instructionId}`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={2}
          placeholder={t(TXT.placeholder)}
          className="w-full rounded-md border border-outline-variant bg-surface-container-lowest p-sm font-body-sm text-body-sm text-on-surface"
        />
        <div>
          <ActionButton variant="primary" onClick={send} busy={busy} disabled={busy || !reply.trim()}>
            {t(TXT.send)}
          </ActionButton>
        </div>
      </div>
      {continued ? (
        <p className="mt-sm rounded-md border border-outline-variant bg-surface-container-lowest p-sm font-body-sm text-body-sm text-on-surface">
          <span className="font-label-sm text-label-sm uppercase text-healthy">{t(TXT.continued)}:</span> {continued}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-xs font-label-sm text-label-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
