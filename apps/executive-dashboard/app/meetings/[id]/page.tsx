/**
 * L30 — Meeting Detail (spec §6/§7). Header → discussion thread (positions,
 * challenges→targets, rebuttals — visibly a debate) → CoS summary → proposed
 * decisions (rationale + dissent) with per-decision CEO Approve/Reject →
 * proposed work (owner/due, proposed badge) → risks + open questions.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusBadge, DataTag } from '../../../components/ds';
import { ChevronEndIcon } from '../../../components/ds/icons';
import { MeetingApprovalControls } from '../../../components/executive-os/MeetingApprovalControls';
import { MeetingLifecycleControls } from '../../../components/executive-os/MeetingLifecycleControls';
import { getMeeting } from '../../../lib/executive-os/meetings';

export const dynamic = 'force-dynamic';

const NAME: Record<string, string> = {
  'chief-of-staff': 'Chief of Staff',
  cto: 'CTO',
  coo: 'COO',
  cfo: 'CFO',
  'vp-marketing': 'VP Marketing',
  'vp-sales': 'VP Sales',
};
const nm = (id: string) => NAME[id] ?? id;

const KIND_STYLE: Record<string, string> = {
  open: 'border-s-primary',
  position: 'border-s-outline-variant',
  challenge: 'border-s-action',
  concur: 'border-s-outline-variant',
  rebuttal: 'border-s-attention',
  synthesis: 'border-s-primary',
};

function statusState(status: string): 'healthy' | 'attention' | 'action' | 'neutral' {
  if (status === 'approved' || status === 'completed') return 'healthy';
  if (status === 'summarized') return 'attention';
  if (status === 'cancelled') return 'action';
  return 'neutral';
}

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMeeting(id);
  if (!m) notFound();

  const rounds = Array.from(new Set(m.discussion.map((u) => u.round))).sort((a, b) => a - b);
  // Per-decision work status by the stamped assigned_work id (stable link) — no
  // fragile position/created_at mapping, so the badge always lands on the right
  // card. Controls show only while a decision's work is still proposed.
  const workById = new Map(m.proposedWork.map((w) => [w.id, w]));
  const workStatusFor = (i: number): string | null => {
    const wid = m.decisions[i]?.assignedWorkId;
    return wid ? workById.get(wid)?.approvalStatus ?? null : null;
  };
  const canApprove = m.status === 'summarized' || m.status === 'approved';

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-4xl">
        <Link href={'/meetings' as never} prefetch={false} className="inline-flex min-h-11 items-center gap-xs font-label-md text-label-md text-primary hover:underline">
          <ChevronEndIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
          Meetings
        </Link>

        <header className="mt-sm mb-xl flex flex-wrap items-start justify-between gap-md">
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm uppercase text-outline">{m.type} · {m.projectSlug}</p>
            <h1 className="font-display text-display text-on-surface">{m.topic}</h1>
            <p className="mt-xs font-label-sm text-label-sm text-outline">
              {m.participants.map(nm).join(' · ')}
            </p>
          </div>
          <StatusBadge state={statusState(m.status)} label={m.status} />
        </header>

        {/* OF-008 — lifecycle control: run a fresh meeting / resume a stalled one. */}
        <div className="mb-xl">
          <MeetingLifecycleControls meetingId={m.id} status={m.status} />
        </div>

        {/* Discussion thread */}
        <Section title="Discussion">
          {m.discussion.length === 0 ? (
            <Empty>Not convened yet.</Empty>
          ) : (
            <div className="space-y-lg">
              {rounds.map((r) => (
                <div key={r}>
                  <p className="mb-sm font-label-sm text-label-sm uppercase tracking-wider text-outline">
                    {roundLabel(r)}
                  </p>
                  <div className="space-y-sm">
                    {m.discussion
                      .filter((u) => u.round === r)
                      .map((u, i) => (
                        <div
                          key={`${r}-${i}`}
                          className={`rounded-lg border border-outline-variant bg-surface-container-lowest p-md border-s-4 ${KIND_STYLE[u.kind] ?? 'border-s-outline-variant'}`}
                        >
                          <div className="mb-xs flex flex-wrap items-center gap-sm">
                            <span className="font-body-md font-medium text-on-surface">{nm(u.executive_id)}</span>
                            <span className="font-label-sm text-label-sm uppercase text-outline">{u.kind}</span>
                            {u.target ? (
                              <span className="inline-flex items-center gap-xs rounded-sm bg-action/10 px-sm py-[1px] font-label-sm text-label-sm text-action">
                                challenges {nm(u.target)}
                              </span>
                            ) : null}
                          </div>
                          {u.claim ? (
                            <p className="mb-xs font-label-sm text-label-sm italic text-on-surface-variant">re: “{u.claim}”</p>
                          ) : null}
                          <p className="whitespace-pre-wrap font-body-md text-body-md text-on-surface-variant">{u.text}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* CoS summary */}
        {m.summary ? (
          <Section title="Chief of Staff — Summary">
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-lg">
              <p className="whitespace-pre-wrap font-body-md text-body-md text-on-surface">{m.summary}</p>
            </div>
          </Section>
        ) : null}

        {/* Decisions + approval */}
        {m.decisions.length > 0 ? (
          <Section title="Proposed Decisions" count={m.decisions.length}>
            <div className="space-y-lg">
              {m.decisions.map((d, i) => (
                <article key={i} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
                  <h3 className="font-title-lg text-title-lg font-bold text-on-surface">{d.decision}</h3>
                  <p className="mt-sm font-body-md text-body-md text-on-surface-variant">{d.rationale}</p>
                  {d.dissenting_opinions.length > 0 ? (
                    <div className="mt-sm rounded border-s-4 border-attention bg-attention/5 ps-md py-sm">
                      <p className="font-label-sm text-label-sm uppercase text-attention">Dissent</p>
                      <ul className="mt-xs space-y-xs">
                        {d.dissenting_opinions.map((o, j) => (
                          <li key={j} className="font-body-md text-body-md text-on-surface-variant">{o}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {d.actionable && d.owner_executive_id ? (
                    <p className="mt-sm font-label-sm text-label-sm text-outline">
                      → work for {nm(d.owner_executive_id)}: {d.work_title || d.decision}
                    </p>
                  ) : null}
                  {(() => {
                    const ws = workStatusFor(i);
                    if (canApprove && ws === 'proposed') {
                      return <MeetingApprovalControls meetingId={m.id} decisionIndex={i} />;
                    }
                    if (ws && ws !== 'proposed') {
                      return (
                        <p className="mt-sm font-label-md text-label-md text-on-surface-variant">
                          Decision {ws === 'approved' ? 'approved ✓' : 'rejected'}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </article>
              ))}
            </div>
          </Section>
        ) : null}

        {/* Proposed work */}
        {m.proposedWork.length > 0 ? (
          <Section title="Proposed Work" count={m.proposedWork.length}>
            <ul className="space-y-sm">
              {m.proposedWork.map((w) => (
                <li key={w.id} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <span className="font-body-md font-medium text-on-surface">{w.title}</span>
                    <WorkStatus status={w.approvalStatus} />
                  </div>
                  <p className="mt-xs font-body-md text-body-md text-on-surface-variant">{w.detail}</p>
                  <p className="mt-xs font-label-sm text-label-sm text-outline">
                    {nm(w.ownerExecutiveId)} · {w.priority}{w.dueDate ? ` · due ${w.dueDate}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {/* OF-008 — surface the zero-work case explicitly (never a silent stall). */}
        {m.proposedWork.length === 0 && (m.status === 'summarized' || m.status === 'completed') ? (
          <Section title="Proposed Work" count={0}>
            <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-md font-body-md text-body-md text-on-surface-variant">
              No action needed — this meeting reached synthesis with no owned work item. The Chief of Staff
              recorded the reason in the summary above (honest no-action, not a stall).
            </p>
          </Section>
        ) : null}

        {m.risks.length > 0 ? (
          <Section title="Risks">
            <ul className="space-y-xs">{m.risks.map((r, i) => <li key={i} className="font-body-md text-body-md text-on-surface-variant">• {r}</li>)}</ul>
          </Section>
        ) : null}
        {m.openQuestions.length > 0 ? (
          <Section title="Open Questions">
            <ul className="space-y-xs">{m.openQuestions.map((q, i) => <li key={i} className="font-body-md text-body-md text-on-surface-variant">• {q}</li>)}</ul>
          </Section>
        ) : null}

        <p className="mt-xl border-t border-outline-variant pt-lg text-center font-label-sm text-label-sm uppercase tracking-widest text-outline">
          <DataTag kind="HAVE" /> <span className="ms-sm align-middle">meetings · assigned_work · ceo_decisions on approval</span>
        </p>
      </div>
    </div>
  );
}

function roundLabel(r: number): string {
  return ['R0 · Open', 'R1 · Positions', 'R2 · Challenge', 'R3 · Rebuttal', 'R4 · Synthesis'][r] ?? `Round ${r}`;
}

function WorkStatus({ status }: { status: string }) {
  const tone =
    status === 'approved'
      ? 'bg-healthy/10 text-healthy border-healthy/30'
      : status === 'rejected'
        ? 'bg-action/10 text-action border-action/30'
        : 'bg-surface-container text-on-surface-variant border-outline-variant';
  return <span className={`inline-flex rounded-full border px-sm py-[1px] font-label-sm text-label-sm ${tone}`}>{status}</span>;
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mb-xl">
      <h2 className="mb-md flex items-baseline gap-sm font-headline-md text-headline-md text-on-surface">
        {title}
        {typeof count === 'number' ? <span className="font-label-sm text-label-sm text-outline">{count}</span> : null}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="font-body-md text-body-md italic text-on-surface-variant">{children}</p>;
}
