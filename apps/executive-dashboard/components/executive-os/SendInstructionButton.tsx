'use client';

/**
 * L31 — "Send Instruction" (spec §5). The CEO instructs ONE executive directly.
 * Authorize-on-send: POST /api/ceo/instructions creates the instruction +
 * ceo_decisions audit + APPROVED assigned_work in one act; then run = the
 * executive responds. No second approval click (the send IS the authorization).
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ActionButton } from '../ds';
import { PlusIcon } from '../ds/icons';

type Phase = 'idle' | 'sending' | 'running';

export function SendInstructionButton({
  projectSlug,
  executiveId,
  executiveName,
}: {
  projectSlug: string;
  executiveId: string;
  executiveName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [expected, setExpected] = useState('');
  const [priority, setPriority] = useState('P2');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const busy = phase !== 'idle';

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => ref.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && close();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  function close() {
    setOpen(false);
    setError(null);
    setPhase('idle');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!instruction.trim()) return setError('Instruction is required.');
    setError(null);
    try {
      setPhase('sending');
      const res = await fetch('/api/ceo/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_slug: projectSlug,
          to_executive_id: executiveId,
          instruction: instruction.trim(),
          expected_output: expected.trim() || null,
          priority,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `send failed (${res.status})`);
      }
      const { instructionId } = (await res.json()) as { instructionId: string };
      setPhase('running');
      // Best-effort: ask the executive to respond. The instruction + approved
      // work already landed (authorize-on-send), so a run failure is non-fatal.
      await fetch(`/api/ceo/instructions/${instructionId}/run`, { method: 'POST' }).catch(() => {});
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setPhase('idle');
    }
  }

  return (
    <>
      <ActionButton variant="primary" startIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Send Instruction
      </ActionButton>
      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-md sm:p-lg"
              onMouseDown={(e) => e.target === e.currentTarget && !busy && close()}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="send-instruction-title"
                className="ds-surface my-[5vh] w-full max-w-[40rem] rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-ambient"
              >
                <div className="mb-md">
                  <h2 id="send-instruction-title" className="font-headline-md text-headline-md text-on-surface">
                    Instruct {executiveName}
                  </h2>
                  <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
                    A direct instruction is your authorization — it lands as approved work the executive
                    owns. (Scope: {projectSlug}.)
                  </p>
                </div>
                <form onSubmit={submit} className="space-y-md">
                  <div>
                    <label htmlFor="i-text" className="block font-label-md text-label-md text-on-surface">Instruction</label>
                    <textarea
                      ref={ref}
                      id="i-text"
                      rows={3}
                      value={instruction}
                      disabled={busy}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder={`What should ${executiveName} do?`}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="i-exp" className="block font-label-md text-label-md text-on-surface">Expected output</label>
                    <p className="mb-xs font-label-sm text-label-sm text-outline">Optional — what should come back?</p>
                    <textarea id="i-exp" rows={2} value={expected} disabled={busy} onChange={(e) => setExpected(e.target.value)} className={inputCls} />
                  </div>
                  <div className="w-40">
                    <label htmlFor="i-pri" className="block font-label-md text-label-md text-on-surface">Priority</label>
                    <select id="i-pri" value={priority} disabled={busy} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                      {['P1', 'P2', 'P3'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  {error ? <p role="alert" className="font-label-md text-label-md text-error">{error}</p> : null}
                  {phase === 'running' ? (
                    <p className="font-label-md text-label-md text-on-surface-variant">Sent — {executiveName} is responding…</p>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-end gap-sm">
                    <ActionButton variant="ghost" onClick={close} disabled={busy} type="button">Cancel</ActionButton>
                    <ActionButton variant="primary" type="submit" busy={busy}>
                      {phase === 'sending' ? 'Sending…' : phase === 'running' ? 'Awaiting reply…' : 'Send'}
                    </ActionButton>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

const inputCls =
  'w-full rounded border border-outline-variant bg-surface-container-lowest px-md py-sm font-body-md text-body-md text-on-surface placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60';
