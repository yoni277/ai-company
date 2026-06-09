'use client';

/**
 * L29 (D069 · CEO Operability) — Work Initiation.
 *
 * The CEO's primary INPUT control: create a directive (work assigned to the
 * executive team) and run it, entirely from the UI — no API client, no ChatGPT,
 * no CTO relay. Directives are INPUTS the CEO creates; decisions are OUTPUTS the
 * system returns to the Inbox — the labeling keeps that distinction explicit.
 *
 * Flow (the proven E1–E4 contract, unchanged):
 *   POST /api/ceo/directives { title, directive, category, priority,
 *        respondingExecutives }                      → creates + enqueues fan-out
 *   POST /api/ceo/directives/{id}/run-pending         → drains the queue (LLM
 *        fan-out, ~30–90s) → executive responses produce decisions/proposals
 *   → land the CEO in /inbox to act on the result.
 *
 * "+ New Meeting" is a disabled "Soon" affordance only — L30 (D070) is a
 * separate entity/workflow built in Phase B; NOT built here.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ActionButton } from '../ds';
import { PlusIcon } from '../ds/icons';
import type { ExecutiveOption } from '../../lib/executive-os';

const CATEGORIES = ['strategy', 'product', 'growth', 'operations', 'finance', 'people', 'override'] as const;
const PRIORITIES = ['P1', 'P2', 'P3'] as const;

/** Category → default responders (mirrors the server default; UX pre-selection only). */
const CATEGORY_DEFAULTS: Record<string, string[]> = {
  strategy: ['chief-of-staff', 'vp-marketing'],
  product: ['cto', 'vp-marketing'],
  growth: ['vp-marketing', 'vp-sales'],
  operations: ['coo', 'vp-sales'],
  finance: ['cfo'],
  people: ['chief-of-staff'],
  override: ['chief-of-staff', 'cto', 'coo', 'cfo', 'vp-marketing', 'vp-sales'],
};

type Phase = 'idle' | 'creating' | 'running';

export function WorkInitiationBar({ executives }: { executives: ExecutiveOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [category, setCategory] = useState<string>('strategy');
  const [priority, setPriority] = useState<string>('P1');
  const [participants, setParticipants] = useState<string[]>(CATEGORY_DEFAULTS.strategy ?? []);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const busy = phase !== 'idle';

  // Portal target is only available after mount (client). Guard so the modal
  // never tries to read document.body during SSR/first render.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => titleRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) close();
    };
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

  function pickCategory(next: string) {
    setCategory(next);
    setParticipants(CATEGORY_DEFAULTS[next] ?? []);
  }

  function toggleParticipant(id: string) {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !objective.trim()) {
      setError('Title and objective are required.');
      return;
    }
    if (participants.length === 0) {
      setError('Pick at least one participant.');
      return;
    }
    setError(null);
    const directive = expectedOutput.trim()
      ? `${objective.trim()}\n\nExpected output: ${expectedOutput.trim()}`
      : objective.trim();
    try {
      setPhase('creating');
      const createRes = await fetch('/api/ceo/directives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          directive,
          category,
          priority,
          respondingExecutives: participants,
        }),
      });
      if (!createRes.ok) {
        const b = (await createRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `create failed (${createRes.status})`);
      }
      const { directive: created } = (await createRes.json()) as { directive: { id: string } };

      setPhase('running');
      const runRes = await fetch(`/api/ceo/directives/${created.id}/run-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!runRes.ok) {
        const b = (await runRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `run failed (${runRes.status})`);
      }
      // Result (decisions/proposals) is now in the Inbox — take the CEO there.
      router.push('/inbox');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setPhase('idle');
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-sm">
        <ActionButton
          variant="primary"
          startIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => setOpen(true)}
          title="Assign work to the executive team"
        >
          New Directive
        </ActionButton>
        {/* L30 — Phase B; disabled affordance only (no dead link) */}
        <span
          aria-disabled="true"
          title="Coming soon (Phase B)"
          className="inline-flex min-h-11 cursor-not-allowed items-center gap-xs rounded border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface-variant opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          New Meeting
          <span className="ms-xs rounded-sm bg-surface-container px-xs py-[1px] font-label-sm text-label-sm text-outline">
            Soon
          </span>
        </span>
      </div>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-md sm:p-lg"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !busy) close();
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-directive-title"
                className="ds-surface my-[5vh] w-full max-w-[40rem] rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-ambient"
              >
            <div className="mb-md">
              <h2 id="new-directive-title" className="font-headline-md text-headline-md text-on-surface">
                New Directive
              </h2>
              <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
                A directive is work you assign to the executive team. They respond, and decisions
                for you to approve land in your Inbox.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-md">
              <Field label="Title" htmlFor="d-title">
                <input
                  ref={titleRef}
                  id="d-title"
                  type="text"
                  value={title}
                  disabled={busy}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short name for this directive"
                  className={inputCls}
                />
              </Field>

              <Field label="Objective" htmlFor="d-objective" hint="What should the team do?">
                <textarea
                  id="d-objective"
                  value={objective}
                  disabled={busy}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={3}
                  placeholder="The goal you want the executives to work on"
                  className={inputCls}
                />
              </Field>

              <Field label="Expected output" htmlFor="d-output" hint="Optional — what should come back?">
                <textarea
                  id="d-output"
                  value={expectedOutput}
                  disabled={busy}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  rows={2}
                  placeholder="e.g. a recommendation, a plan, a go/no-go"
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-md">
                <Field label="Category" htmlFor="d-category">
                  <select id="d-category" value={category} disabled={busy} onChange={(e) => pickCategory(e.target.value)} className={inputCls}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c[0]?.toUpperCase()}{c.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority" htmlFor="d-priority">
                  <select id="d-priority" value={priority} disabled={busy} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <fieldset disabled={busy}>
                <legend className="font-label-md text-label-md text-on-surface">Participants</legend>
                <p className="mb-xs font-label-sm text-label-sm text-outline">
                  Which executives respond. Defaults follow the category — adjust as needed.
                </p>
                <div className="grid grid-cols-2 gap-x-md gap-y-xs sm:grid-cols-3">
                  {executives.map((ex) => (
                    <label key={ex.id} className="flex items-center gap-sm font-body-md text-body-md text-on-surface">
                      <input
                        type="checkbox"
                        checked={participants.includes(ex.id)}
                        onChange={() => toggleParticipant(ex.id)}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      {ex.displayName}
                    </label>
                  ))}
                </div>
              </fieldset>

              {error ? (
                <p role="alert" className="font-label-md text-label-md text-error">{error}</p>
              ) : null}

              {phase === 'running' ? (
                <p className="font-label-md text-label-md text-on-surface-variant">
                  Running the executive team — this can take 30–90s. Hang tight…
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-sm">
                <ActionButton variant="ghost" onClick={close} disabled={busy} type="button">
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="primary"
                  type="submit"
                  busy={busy}
                >
                  {phase === 'creating' ? 'Creating…' : phase === 'running' ? 'Running…' : 'Create & Run'}
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

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block font-label-md text-label-md text-on-surface">
        {label}
      </label>
      {hint ? <p className="mb-xs font-label-sm text-label-sm text-outline">{hint}</p> : <div className="mb-xs" />}
      {children}
    </div>
  );
}
