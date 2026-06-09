'use client';

/**
 * EPIC-004 Phase 6 — Executive Desktop ("how is THIS person doing?").
 *
 * Locale-aware (EN/HE) client view over the L31 workspace payload, now backed by
 * the SHARED work-control-core classifier (Step 1). Renders the five sections —
 * Identity · Current Work · Performance · Communication · Timeline. Current Work
 * groups by the SAME states as /work (STATE_META) and LINKS into /work for the
 * manage verbs (no duplicate approve/execute here). Send Instruction + memory
 * edit (L31) are preserved by the server page and passed in as slots.
 */

import Link from 'next/link';
import { useTheme } from '../../theme-provider';
import { StatusBadge } from '../../ds/StatusBadge';
import { STATE_META, STATE_ORDER, SOURCE_LABEL, tx } from '../work/labels';
import type {
  WorkspacePayload,
  PerformanceStats,
  CommunicationBlock,
} from '../../../lib/executive-os/executives';
import type { WorkListItem } from '../../../lib/executive-os/work-control-core';

const L = {
  identity: { en: 'Identity', he: 'זהות' },
  currentWork: { en: 'Current Work', he: 'עבודה נוכחית' },
  performance: { en: 'Performance', he: 'ביצועים' },
  communication: { en: 'Communication', he: 'תקשורת' },
  timeline: { en: 'Timeline', he: 'ציר זמן' },
  role: { en: 'Role', he: 'תפקיד' },
  strategy: { en: 'Current strategy', he: 'אסטרטגיה נוכחית' },
  assumptions: { en: 'Known assumptions', he: 'הנחות ידועות' },
  objectives: { en: 'Current objectives', he: 'יעדים נוכחיים' },
  risks: { en: 'Risks recorded', he: 'סיכונים שתועדו' },
  responsibilities: { en: 'Responsibilities', he: 'אחריות' },
  authority: { en: 'Authority', he: 'סמכות' },
  none: { en: 'None.', he: 'אין.' },
  noWork: { en: 'No work assigned yet.', he: 'אין עדיין עבודה.' },
  manageInWork: { en: 'Manage in Work', he: 'ניהול בעבודה' },
  assigned: { en: 'Assigned', he: 'הוקצו' },
  completed: { en: 'Completed', he: 'הושלמו' },
  blocked: { en: 'Blocked', he: 'חסומים' },
  overdue: { en: 'Overdue', he: 'באיחור' },
  avgAge: { en: 'Average age', he: 'גיל ממוצע' },
  oldestOpen: { en: 'Oldest open item', he: 'הפריט הפתוח הוותיק' },
  pendingInstructions: { en: 'Pending instructions', he: 'הוראות ממתינות' },
  pendingQuestions: { en: 'Pending questions', he: 'שאלות ממתינות' },
  pendingApprovals: { en: 'Pending approvals', he: 'אישורים ממתינים' },
  recentMeetings: { en: 'Recent meetings', he: 'ישיבות אחרונות' },
  recentDecisions: { en: 'Recent decisions', he: 'החלטות אחרונות' },
  recentReports: { en: 'Recent reports', he: 'דוחות אחרונים' },
  days: { en: 'd', he: 'ימ׳' },
} as const;

function t(p: { en: string; he: string }, he: boolean): string {
  return he ? p.he : p.en;
}

function workHref(execId: string, slug: string): string {
  return `/work?owner=${execId}&project_slug=${slug}`;
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
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

function Empty({ label }: { label: string }) {
  return <p className="font-body-md text-body-md italic text-on-surface-variant">{label}</p>;
}

function WorkItemRow({ item, execId, slug, he }: { item: WorkListItem; execId: string; slug: string; he: boolean }) {
  const src = SOURCE_LABEL[item.sourceType] ? tx(SOURCE_LABEL[item.sourceType]!, he) : item.sourceType;
  return (
    <li>
      <Link
        href={workHref(execId, slug) as never}
        prefetch={false}
        className="flex items-center justify-between gap-sm rounded border border-outline-variant bg-surface-container-lowest p-sm hover:shadow-ambient"
      >
        <span className="min-w-0 truncate font-body-md text-body-md text-on-surface">{item.title}</span>
        <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">
          {src} · {item.priority} · {item.daysInCurrentState}
          {t(L.days, he)}
        </span>
      </Link>
    </li>
  );
}

function Stat({ label, value, tone = 'text-on-surface' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">{label}</p>
      <p className={`mt-xs font-headline-md text-headline-md ${tone}`}>{value}</p>
    </div>
  );
}

function ListBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
      <p className="mb-sm font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{title}</p>
      {children}
    </div>
  );
}

export function ExecutiveDesktop({
  ws,
  slug,
  memorySlot,
}: {
  ws: WorkspacePayload;
  slug: string;
  memorySlot: React.ReactNode;
}) {
  const { locale } = useTheme();
  const he = locale === 'he';
  const execId = ws.executiveId;
  const perf: PerformanceStats = ws.performance;
  const comm: CommunicationBlock = ws.communication;

  const workBuckets = STATE_ORDER.map((state) => ({ state, items: ws.currentWork.byState[state] ?? [] })).filter(
    (b) => b.items.length > 0,
  );

  return (
    <div>
      {/* 1 — Identity */}
      <Section title={t(L.identity, he)}>
        <div className="grid gap-lg lg:grid-cols-2">
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">{t(L.role, he)}</p>
            <p className="font-title-md text-title-md text-on-surface">{ws.executiveName}</p>
            {ws.charter ? (
              <>
                <p className="mt-sm font-label-sm text-label-sm uppercase text-on-surface-variant">{t(L.responsibilities, he)}</p>
                <ul className="ms-md list-disc font-body-sm text-body-sm text-on-surface">
                  {ws.charter.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
                <p className="mt-sm font-label-sm text-label-sm uppercase text-on-surface-variant">{t(L.authority, he)}</p>
                <ul className="ms-md list-disc font-body-sm text-body-sm text-on-surface">
                  {ws.charter.authority.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </>
            ) : null}
          </div>
          {/* L31 memory edit — preserved, passed from the server page */}
          <div>{memorySlot}</div>
        </div>

        <div className="mt-lg grid gap-lg lg:grid-cols-2">
          <ListBlock title={`${t(L.objectives, he)} · ${ws.objectives.length}`}>
            {ws.objectives.length === 0 ? (
              <Empty label={t(L.none, he)} />
            ) : (
              <ul className="space-y-xs">
                {ws.objectives.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-sm font-body-sm text-body-sm text-on-surface">
                    <span className="min-w-0 truncate">{o.title}</span>
                    <span className="shrink-0 font-label-sm text-label-sm uppercase text-outline">{o.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </ListBlock>
          <ListBlock title={`${t(L.risks, he)} · ${ws.risks.length}`}>
            {ws.risks.length === 0 ? (
              <Empty label={t(L.none, he)} />
            ) : (
              <ul className="space-y-xs">
                {ws.risks.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-sm font-body-sm text-body-sm text-on-surface">
                    <span className="min-w-0 truncate">{r.description}</span>
                    <span className="shrink-0 font-label-sm text-label-sm uppercase text-outline">{r.severity}</span>
                  </li>
                ))}
              </ul>
            )}
          </ListBlock>
        </div>
      </Section>

      {/* 2 — Current Work (shared classifier; links to /work) */}
      <Section title={t(L.currentWork, he)} count={ws.currentWork.items.length}>
        <div className="mb-sm flex justify-end">
          <Link href={workHref(execId, slug) as never} prefetch={false} className="font-label-sm text-label-sm text-primary hover:underline">
            {t(L.manageInWork, he)} →
          </Link>
        </div>
        {ws.currentWork.items.length === 0 ? (
          <Empty label={t(L.noWork, he)} />
        ) : (
          <div className="grid gap-lg lg:grid-cols-2">
            {workBuckets.map((b) => {
              const meta = STATE_META[b.state];
              return (
                <div key={b.state} className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
                  <div className="mb-sm flex items-center gap-sm">
                    <StatusBadge state={meta.health} label={tx(meta, he)} size="sm" />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">({b.items.length})</span>
                  </div>
                  <ul className="space-y-sm">
                    {b.items.map((it) => (
                      <WorkItemRow key={it.id} item={it} execId={execId} slug={slug} he={he} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* 3 — Performance (real spine numbers; honest zeros) */}
      <Section title={t(L.performance, he)}>
        <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-6">
          <Stat label={t(L.assigned, he)} value={perf.assigned} />
          <Stat label={t(L.completed, he)} value={perf.completed} tone="text-healthy" />
          <Stat label={t(L.blocked, he)} value={perf.blocked} tone={perf.blocked > 0 ? 'text-action' : 'text-on-surface'} />
          <Stat label={t(L.overdue, he)} value={perf.overdue} tone={perf.overdue > 0 ? 'text-action' : 'text-on-surface'} />
          <Stat label={t(L.avgAge, he)} value={`${perf.averageAgeDays}${t(L.days, he)}`} />
          <Stat
            label={t(L.oldestOpen, he)}
            value={perf.oldestOpen ? `${perf.oldestOpen.ageDays}${t(L.days, he)}` : t(L.none, he)}
          />
        </div>
        {perf.oldestOpen ? (
          <p className="mt-xs font-label-sm text-label-sm text-on-surface-variant">
            {t(L.oldestOpen, he)}: {perf.oldestOpen.title}
          </p>
        ) : null}
      </Section>

      {/* 4 — Communication */}
      <Section title={t(L.communication, he)}>
        <div className="grid gap-lg lg:grid-cols-2">
          <ListBlock title={`${t(L.pendingQuestions, he)} · ${comm.pendingQuestions.length}`}>
            {comm.pendingQuestions.length === 0 ? (
              <Empty label={t(L.none, he)} />
            ) : (
              <ul className="space-y-xs">
                {comm.pendingQuestions.map((q) => (
                  <li key={q.id} className="font-body-sm text-body-sm text-on-surface">{q.instruction}</li>
                ))}
              </ul>
            )}
          </ListBlock>
          <ListBlock title={`${t(L.pendingInstructions, he)} · ${comm.pendingInstructions.length}`}>
            {comm.pendingInstructions.length === 0 ? (
              <Empty label={t(L.none, he)} />
            ) : (
              <ul className="space-y-xs">
                {comm.pendingInstructions.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-sm font-body-sm text-body-sm text-on-surface">
                    <span className="min-w-0 truncate">{i.instruction}</span>
                    <span className="shrink-0 font-label-sm text-label-sm uppercase text-outline">{i.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </ListBlock>
          <ListBlock title={`${t(L.recentMeetings, he)} · ${comm.recentMeetings.length}`}>
            {comm.recentMeetings.length === 0 ? (
              <Empty label={t(L.none, he)} />
            ) : (
              <ul className="space-y-xs">
                {comm.recentMeetings.map((m) => (
                  <li key={m.id}>
                    <Link href={`/meetings/${m.id}` as never} prefetch={false} className="flex items-center justify-between gap-sm font-body-sm text-body-sm text-on-surface hover:text-primary">
                      <span className="min-w-0 truncate">{m.topic}</span>
                      <span className="shrink-0 font-label-sm text-label-sm uppercase text-outline">{m.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ListBlock>
          <ListBlock title={`${t(L.recentDecisions, he)} · ${comm.recentDecisions.length}`}>
            {comm.recentDecisions.length === 0 ? (
              <Empty label={t(L.none, he)} />
            ) : (
              <ul className="space-y-xs">
                {comm.recentDecisions.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-sm font-body-sm text-body-sm text-on-surface">
                    <span className="min-w-0 truncate">{d.title}</span>
                    <span className="shrink-0 font-label-sm text-label-sm uppercase text-outline">{d.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </ListBlock>
          <ListBlock title={`${t(L.recentReports, he)} · ${ws.reports.length}`}>
            {ws.reports.length === 0 ? (
              <Empty label={t(L.none, he)} />
            ) : (
              <ul className="space-y-xs">
                {ws.reports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-sm font-body-sm text-body-sm text-on-surface">
                    <span className="min-w-0 truncate">{r.summary}</span>
                    <span className="shrink-0 font-label-sm text-label-sm uppercase text-outline">{r.reportType}</span>
                  </li>
                ))}
              </ul>
            )}
          </ListBlock>
          <ListBlock title={t(L.pendingApprovals, he)}>
            <p className="font-headline-md text-headline-md text-on-surface">{comm.pendingApprovals}</p>
          </ListBlock>
        </div>
      </Section>

      {/* 5 — Timeline */}
      <Section title={t(L.timeline, he)} count={ws.timeline.length}>
        {ws.timeline.length === 0 ? (
          <Empty label={t(L.none, he)} />
        ) : (
          <ul className="space-y-xs">
            {ws.timeline.map((tl, i) => (
              <li key={i} className="flex items-start gap-sm font-body-md text-body-md text-on-surface-variant">
                <span className="shrink-0 font-label-sm text-label-sm uppercase text-outline">{tl.at.slice(0, 10)}</span>
                <span className="shrink-0 font-label-sm text-label-sm uppercase text-outline">{tl.kind}</span>
                <span className="min-w-0 flex-1 truncate text-on-surface">{tl.label}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
