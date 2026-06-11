'use client';

/**
 * EPIC-004 Phase 5 — CEO Situation Room (`/situation`) view.
 *
 * The one-screen, five-question SUMMARY over the same converged spine WCC
 * manages. READ-ONLY: every panel is a summary that LINKS into /work (where the
 * CEO acts) — the Room introduces no mutations. Attention-first. Locale-aware
 * (EN/HE) over server-loaded, project_slug-scoped data; RTL via logical CSS.
 *
 * D068: the "winning" panel is incapable of showing fabricated business
 * evidence — it renders the honest "No business evidence wired yet" for KPIs and
 * shows only real spine outcomes (completed work, approved decisions).
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../theme-provider';
import { StatusBadge } from '../../ds/StatusBadge';
import { STATE_META, SOURCE_LABEL, execLabel, tx, type Locale } from '../work/labels';
import { InspectorLayout } from '../lineage/Inspector';
import { LineageControls } from '../lineage/LineageControls';
import type { SituationRoom, WorkByExecutive } from '../../../lib/executive-os/situation-room';
import type { AttentionItem, WorkListItem } from '../../../lib/executive-os/work-control-core';

const SR = {
  title: { en: 'Situation Room', he: 'חדר מצב' },
  subtitle: { en: 'Your whole company in one minute.', he: 'כל החברה שלך בדקה אחת.' },
  asOf: { en: 'as of', he: 'נכון ל־' },
  business: { en: 'Business', he: 'עסק' },
  viewInWork: { en: 'View in Work', he: 'פתח בעבודה' },
  p1: { en: 'What needs my attention?', he: 'מה דורש את תשומת ליבי?' },
  p2: { en: 'What are my people working on?', he: 'על מה הצוות עובד?' },
  p3: { en: 'What is blocked?', he: 'מה חסום?' },
  p4: { en: 'What is winning?', he: 'מה מנצח?' },
  p5: { en: 'What decision do I need to make?', he: 'איזו החלטה עליי לקבל?' },
  emptyAttention: { en: 'Nothing needs you right now.', he: 'שום דבר לא דורש אותך כעת.' },
  emptyPeople: { en: 'No active work.', he: 'אין עבודה פעילה.' },
  emptyBlocked: { en: 'Nothing is blocked.', he: 'שום דבר לא חסום.' },
  emptyDecisions: { en: 'No decisions pending.', he: 'אין החלטות ממתינות.' },
  noEvidence: { en: 'No business evidence wired yet', he: 'אין עדיין ראיות עסקיות מחוברות' },
  noEvidenceNote: {
    en: 'Real KPIs — visitors, signups, revenue — appear here once business evidence is connected. Platform progress is not a business win.',
    he: 'מדדים אמיתיים — מבקרים, הרשמות, הכנסות — יופיעו כאן לאחר חיבור ראיות עסקיות. התקדמות פלטפורמה אינה ניצחון עסקי.',
  },
  completedOutcomes: { en: 'Completed (spine outcomes)', he: 'הושלמו (תוצרי שדרה)' },
  approvedDecisions: { en: 'Approved decisions', he: 'החלטות מאושרות' },
  inProgress: { en: 'in progress', he: 'בתהליך' },
  open: { en: 'open', he: 'פתוח' },
  days: { en: 'd', he: 'ימ׳' },
} as const;

function t(pair: { en: string; he: string }, he: boolean): string {
  return he ? pair.he : pair.en;
}

function workHref(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/work?${s}` : '/work';
}

function Panel({
  title,
  count,
  href,
  he,
  children,
}: {
  title: string;
  count?: number;
  href: string;
  he: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <div className="mb-sm flex items-center justify-between gap-sm">
        <h2 className="font-title-md text-title-md text-on-surface">
          {title}
          {typeof count === 'number' ? (
            <span className="ms-xs font-label-md text-label-md text-on-surface-variant">({count})</span>
          ) : null}
        </h2>
        <Link
          href={href as never}
          prefetch={false}
          className="shrink-0 font-label-sm text-label-sm text-primary hover:underline"
        >
          {t(SR.viewInWork, he)} →
        </Link>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="rounded-md border border-dashed border-outline-variant bg-surface-container-low p-md font-body-sm text-body-sm text-on-surface-variant">
      {label}
    </p>
  );
}

function AttentionRow({ item, slug, he }: { item: AttentionItem; slug: string | null; he: boolean }) {
  const meta = STATE_META[item.state];
  return (
    <li className="border-t border-outline-variant py-xs first:border-t-0">
      <div className="flex items-center justify-between gap-sm">
        <div className="min-w-0">
          <div className="truncate font-body-sm text-body-sm text-on-surface">{item.title}</div>
          <div className="mt-[1px] font-label-sm text-label-sm text-on-surface-variant">
            {execLabel(item.ownerExecutiveId, he)} · {item.daysInCurrentState}
            {t(SR.days, he)}
          </div>
        </div>
        <Link href={workHref({ project_slug: slug ?? undefined }) as never} prefetch={false} className="shrink-0">
          <StatusBadge state={meta.health} label={tx(meta, he)} size="sm" />
        </Link>
      </div>
      <LineageControls type="work" id={item.id} className="mt-xs" />
    </li>
  );
}

function BlockedRow({ item, he }: { item: WorkListItem; he: boolean }) {
  return (
    <li className="border-t border-outline-variant py-xs first:border-t-0">
      <div className="flex items-center justify-between gap-sm">
        <div className="min-w-0">
          <div className="truncate font-body-sm text-body-sm text-on-surface">{item.title}</div>
          <div className="mt-[1px] font-label-sm text-label-sm text-on-surface-variant">
            {execLabel(item.ownerExecutiveId, he)}
          </div>
        </div>
        <span className="shrink-0 font-label-sm text-label-sm font-medium text-action">
          {item.daysInCurrentState}
          {t(SR.days, he)}
        </span>
      </div>
      <LineageControls type="work" id={item.id} className="mt-xs" />
    </li>
  );
}

function ExecRow({ row, slug, he }: { row: WorkByExecutive; slug: string | null; he: boolean }) {
  return (
    <li className="flex items-center justify-between gap-sm border-t border-outline-variant py-xs first:border-t-0">
      <Link
        href={workHref({ owner: row.executiveId, project_slug: slug ?? undefined }) as never}
        prefetch={false}
        className="truncate font-body-sm text-body-sm text-on-surface hover:text-primary hover:underline"
      >
        {execLabel(row.executiveId === 'unassigned' ? null : row.executiveId, he)}
      </Link>
      <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">
        {row.inProgress} {t(SR.inProgress, he)} · {row.open} {t(SR.open, he)}
      </span>
    </li>
  );
}

export function SituationView({
  situation,
  businesses,
  currentSlug,
}: {
  situation: SituationRoom;
  businesses: Array<{ slug: string; name: string }>;
  currentSlug: string | null;
}) {
  const { locale } = useTheme();
  const he = locale === 'he';
  const router = useRouter();
  const slug = situation.projectSlug;

  const asOf = new Date(situation.asOf);
  const asOfText = `${asOf.toLocaleDateString(he ? 'he-IL' : 'en-GB')} ${asOf.toLocaleTimeString(he ? 'he-IL' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}`;

  const w = situation.winning.spineOutcomes;

  return (
    <InspectorLayout>
    <div className="flex flex-col gap-lg">
      <header className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="font-display text-display text-on-surface">{t(SR.title, he)}</h1>
          <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">{t(SR.subtitle, he)}</p>
        </div>
        <div className="flex flex-col items-end gap-xs">
          <label className="flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant">
            {t(SR.business, he)}
            <select
              value={currentSlug ?? ''}
              onChange={(e) =>
                router.replace((e.target.value ? `/situation?project_slug=${e.target.value}` : '/situation') as never)
              }
              className="min-h-9 rounded-md border border-outline-variant bg-surface-container-lowest px-sm font-label-sm text-label-sm text-on-surface"
            >
              {businesses.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {t(SR.asOf, he)} {asOfText}
          </span>
        </div>
      </header>

      {/* 1 — Attention FIRST, full width */}
      <Panel title={t(SR.p1, he)} count={situation.attention.total} href={workHref({ project_slug: slug ?? undefined })} he={he}>
        {situation.attention.total === 0 ? (
          <Empty label={t(SR.emptyAttention, he)} />
        ) : (
          <>
            <div className="mb-sm flex flex-wrap gap-xs">
              {Object.entries(situation.attention.byState).map(([state, n]) => {
                const meta = STATE_META[state as keyof typeof STATE_META];
                return <StatusBadge key={state} state={meta.health} label={`${tx(meta, he)}: ${n}`} size="sm" />;
              })}
            </div>
            <ul>
              {situation.attention.top.map((a) => (
                <AttentionRow key={a.id} item={a} slug={slug} he={he} />
              ))}
            </ul>
          </>
        )}
      </Panel>

      {/* 2–5 grid */}
      <div className="grid gap-lg md:grid-cols-2">
        <Panel title={t(SR.p2, he)} count={situation.workByExecutive.length} href={workHref({ project_slug: slug ?? undefined })} he={he}>
          {situation.workByExecutive.length === 0 ? (
            <Empty label={t(SR.emptyPeople, he)} />
          ) : (
            <ul>
              {situation.workByExecutive.map((r) => (
                <ExecRow key={r.executiveId} row={r} slug={slug} he={he} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={t(SR.p3, he)}
          count={situation.blocked.total}
          href={workHref({ blocked: '1', project_slug: slug ?? undefined })}
          he={he}
        >
          {situation.blocked.total === 0 ? (
            <Empty label={t(SR.emptyBlocked, he)} />
          ) : (
            <ul>
              {situation.blocked.items.map((b) => (
                <BlockedRow key={b.id} item={b} he={he} />
              ))}
            </ul>
          )}
        </Panel>

        {/* 4 — Winning: EVIDENCE-GATED (D068) */}
        <Panel title={t(SR.p4, he)} href={workHref({ project_slug: slug ?? undefined })} he={he}>
          {/* Business KPIs — honest empty until WDIP evidence lands */}
          <div className="rounded-md border border-dashed border-outline-variant bg-surface-container-low p-md">
            <div className="font-title-sm text-title-sm text-on-surface-variant">{t(SR.noEvidence, he)}</div>
            <p className="mt-xs font-label-sm text-label-sm text-on-surface-variant">{t(SR.noEvidenceNote, he)}</p>
          </div>
          {/* Real spine outcomes — honest progress, NOT business KPIs */}
          <div className="mt-sm flex flex-wrap items-center gap-md">
            <span className="font-body-sm text-body-sm text-on-surface">
              {t(SR.completedOutcomes, he)}:{' '}
              <span className="font-medium">{w.completedWork}</span>
            </span>
            <span className="font-body-sm text-body-sm text-on-surface">
              {t(SR.approvedDecisions, he)}: <span className="font-medium">{w.approvedDecisions}</span>
            </span>
          </div>
          {w.completedItems.length > 0 ? (
            <ul className="mt-xs">
              {w.completedItems.map((c) => (
                <li key={c.id} className="border-t border-outline-variant py-xs font-body-sm text-body-sm text-on-surface first:border-t-0">
                  {c.title}{' '}
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    · {SOURCE_LABEL[c.sourceType] ? tx(SOURCE_LABEL[c.sourceType]!, he) : c.sourceType}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <Panel
          title={t(SR.p5, he)}
          count={situation.decisions.total}
          href={workHref({ waiting_on_ceo: '1', project_slug: slug ?? undefined })}
          he={he}
        >
          {situation.decisions.total === 0 ? (
            <Empty label={t(SR.emptyDecisions, he)} />
          ) : (
            <ul>
              {situation.decisions.items.map((d) => {
                const meta = STATE_META[d.state];
                return (
                  <li key={d.id} className="flex items-center justify-between gap-sm border-t border-outline-variant py-xs first:border-t-0">
                    <span className="truncate font-body-sm text-body-sm text-on-surface">{d.title}</span>
                    <StatusBadge state={meta.health} label={tx(meta, he)} size="sm" />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
    </InspectorLayout>
  );
}
