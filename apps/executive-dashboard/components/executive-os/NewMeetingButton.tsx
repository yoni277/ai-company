'use client';

/**
 * L30 — "+ New Meeting" (spec §6). A separate workflow from "+ New Directive":
 * a directive fans work out to executives; a meeting convenes them to DEBATE and
 * returns proposed decisions/work the CEO approves. Wizard: Type (drives default
 * participants + agenda) · Business (project_slug, REQUIRED) · Topic ·
 * Participants (editable) · Evidence pack (pick risks/reports) → Create & Convene
 * → run-state ("Convening the executive team… 30–120s") → Meeting Detail.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ActionButton } from '../ds';
import { PlusIcon } from '../ds/icons';
import type { ExecutiveOption } from '../../lib/executive-os';

export interface MeetingTypeOption {
  type: string;
  label: string;
  defaultParticipants: string[];
  defaultAgenda: string[];
  description: string | null;
}
export interface BusinessOption {
  slug: string;
  name: string;
}
interface EvidenceOption {
  kind: string;
  text: string;
  ref?: string;
}

type Phase = 'idle' | 'creating' | 'running';

export function NewMeetingButton({
  types,
  businesses,
  executives,
}: {
  types: MeetingTypeOption[];
  businesses: BusinessOption[];
  executives: ExecutiveOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [typeKey, setTypeKey] = useState(types[0]?.type ?? '');
  const [slug, setSlug] = useState(businesses[0]?.slug ?? '');
  const [topic, setTopic] = useState('');
  const [participants, setParticipants] = useState<string[]>(types[0]?.defaultParticipants ?? []);
  const [evidence, setEvidence] = useState<EvidenceOption[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const topicRef = useRef<HTMLInputElement>(null);

  const busy = phase !== 'idle';
  const selectedType = types.find((t) => t.type === typeKey) ?? types[0];

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => topicRef.current?.focus(), 0);
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

  // Load evidence options when the business changes (wizard open).
  useEffect(() => {
    if (!open || !slug) return;
    let live = true;
    setEvidence([]);
    setSelectedEvidence([]);
    fetch(`/api/ceo/meetings/evidence?project_slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : { options: [] }))
      .then((d: { options?: EvidenceOption[] }) => {
        if (live) setEvidence(d.options ?? []);
      })
      .catch(() => {
        if (live) setEvidence([]);
      });
    return () => {
      live = false;
    };
  }, [open, slug]);

  function close() {
    setOpen(false);
    setError(null);
    setPhase('idle');
  }
  function pickType(next: string) {
    setTypeKey(next);
    const t = types.find((x) => x.type === next);
    setParticipants(t?.defaultParticipants ?? []);
  }
  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!slug) return setError('Pick a business.');
    if (!topic.trim()) return setError('Topic is required.');
    if (participants.length === 0) return setError('Pick at least one participant.');
    setError(null);
    const evidence_pack = selectedEvidence.map((i) => evidence[i]).filter(Boolean);
    try {
      setPhase('creating');
      const createRes = await fetch('/api/ceo/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_slug: slug, type: typeKey, topic: topic.trim(), participants, evidence_pack }),
      });
      if (!createRes.ok) {
        const b = (await createRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `create failed (${createRes.status})`);
      }
      const { id } = (await createRes.json()) as { id: string };

      setPhase('running');
      const runRes = await fetch(`/api/ceo/meetings/${id}/run`, { method: 'POST' });
      if (!runRes.ok) {
        const b = (await runRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `run failed (${runRes.status})`);
      }
      router.push(`/meetings/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setPhase('idle');
    }
  }

  return (
    <>
      <ActionButton variant="secondary" startIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setOpen(true)}>
        New Meeting
      </ActionButton>

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
                aria-labelledby="new-meeting-title"
                className="ds-surface my-[5vh] w-full max-w-[40rem] rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-ambient"
              >
                <div className="mb-md">
                  <h2 id="new-meeting-title" className="font-headline-md text-headline-md text-on-surface">
                    New Meeting
                  </h2>
                  <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
                    Convene the executives to debate a decision. They challenge each other; the Chief of
                    Staff synthesizes; proposed decisions and work land here for your approval.
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-md">
                  <div className="grid grid-cols-2 gap-md">
                    <Field label="Type" htmlFor="m-type">
                      <select id="m-type" value={typeKey} disabled={busy} onChange={(e) => pickType(e.target.value)} className={inputCls}>
                        {types.map((t) => (
                          <option key={t.type} value={t.type}>{t.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Business" htmlFor="m-business" hint="Required — meeting is scoped to one business.">
                      <select id="m-business" value={slug} disabled={busy} onChange={(e) => setSlug(e.target.value)} className={inputCls}>
                        {businesses.length === 0 ? <option value="">(no businesses)</option> : null}
                        {businesses.map((b) => (
                          <option key={b.slug} value={b.slug}>{b.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {selectedType?.defaultAgenda?.length ? (
                    <p className="font-label-sm text-label-sm text-outline">
                      Agenda: {selectedType.defaultAgenda.join(' · ')}
                    </p>
                  ) : null}

                  <Field label="Topic" htmlFor="m-topic" hint="The decision the room must produce.">
                    <input
                      ref={topicRef}
                      id="m-topic"
                      type="text"
                      value={topic}
                      disabled={busy}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Choose the hero automation to ship first"
                      className={inputCls}
                    />
                  </Field>

                  <fieldset disabled={busy}>
                    <legend className="font-label-md text-label-md text-on-surface">Participants</legend>
                    <p className="mb-xs font-label-sm text-label-sm text-outline">Default from the meeting type — adjust as needed.</p>
                    <div className="grid grid-cols-2 gap-x-md gap-y-xs sm:grid-cols-3">
                      {executives.map((ex) => (
                        <label key={ex.id} className="flex items-center gap-sm font-body-md text-body-md text-on-surface">
                          <input
                            type="checkbox"
                            checked={participants.includes(ex.id)}
                            onChange={() => setParticipants((p) => toggle(p, ex.id))}
                            className="h-4 w-4 accent-[var(--color-primary)]"
                          />
                          {ex.displayName}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset disabled={busy}>
                    <legend className="font-label-md text-label-md text-on-surface">Evidence pack</legend>
                    <p className="mb-xs font-label-sm text-label-sm text-outline">
                      Optional — facts from this business the room should weigh.
                    </p>
                    {evidence.length === 0 ? (
                      <p className="font-label-sm text-label-sm italic text-outline">No evidence available for this business.</p>
                    ) : (
                      <div className="max-h-40 space-y-xs overflow-y-auto">
                        {evidence.map((ev, i) => (
                          <label key={i} className="flex items-start gap-sm font-body-md text-body-md text-on-surface">
                            <input
                              type="checkbox"
                              checked={selectedEvidence.includes(i)}
                              onChange={() => setSelectedEvidence((s) => toggle(s, i))}
                              className="mt-[3px] h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                            />
                            <span><span className="font-label-sm uppercase text-outline">{ev.kind}</span> · {ev.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>

                  {error ? <p role="alert" className="font-label-md text-label-md text-error">{error}</p> : null}
                  {phase === 'running' ? (
                    <p className="font-label-md text-label-md text-on-surface-variant">
                      Convening the executive team — debate runs ~30–120s. Hang tight…
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-end gap-sm">
                    <ActionButton variant="ghost" onClick={close} disabled={busy} type="button">Cancel</ActionButton>
                    <ActionButton variant="primary" type="submit" busy={busy}>
                      {phase === 'creating' ? 'Creating…' : phase === 'running' ? 'Convening…' : 'Create & Convene'}
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

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block font-label-md text-label-md text-on-surface">{label}</label>
      {hint ? <p className="mb-xs font-label-sm text-label-sm text-outline">{hint}</p> : <div className="mb-xs" />}
      {children}
    </div>
  );
}
