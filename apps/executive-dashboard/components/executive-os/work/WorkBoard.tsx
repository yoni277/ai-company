'use client';

/**
 * EPIC-004 (WCC) — the /work board. Locale-aware (EN/HE) client view over the
 * server-loaded, project_slug-scoped spine data. Layout is the locked ruling:
 * Attention Queue FIRST → Master Work List GROUPED by attention state. Every row
 * answers the six CEO questions without a click: owner · approval+execution
 * status · due/review · days-in-state · attention badge + inline action · source
 * (drill-in). RTL mirrors via CSS logical properties + the <html dir> flip.
 */

import Link from 'next/link';
import { useTheme } from '../../theme-provider';
import { StatusBadge } from '../../ds/StatusBadge';
import { WorkRowActions } from './WorkRowActions';
import { LineageControls } from '../lineage/LineageControls';
import { STATE_META, STATE_ORDER, SOURCE_LABEL, T, tx, execLabel, type Locale } from './labels';
import type { WorkListItem, AttentionItem } from '../../../lib/executive-os/work-control-core';

function priorityHealth(p: string): 'action' | 'attention' | 'neutral' {
  if (p === 'P0' || p === 'P1') return 'action';
  if (p === 'P2') return 'attention';
  return 'neutral';
}

function sourceHref(sourceType: string, sourceId: string): string | null {
  if (sourceType === 'directive') return `/ceo/directives/${sourceId}`;
  if (sourceType === 'meeting') return `/meetings/${sourceId}`;
  return null; // instruction has no standalone page yet
}

function SourceCell({ item, he }: { item: WorkListItem; he: boolean }) {
  const label = SOURCE_LABEL[item.sourceType]
    ? tx(SOURCE_LABEL[item.sourceType]!, he)
    : item.sourceType;
  const href = sourceHref(item.sourceType, item.sourceId);
  return (
    <div className="flex flex-col gap-[2px]">
      {href ? (
        <Link href={href as never} prefetch={false} className="font-label-sm text-label-sm text-primary hover:underline">
          {label} ↗
        </Link>
      ) : (
        <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      )}
      {item.linkedTaskId ? (
        <Link
          href={`/tasks/${item.linkedTaskId}` as never}
          prefetch={false}
          className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary hover:underline"
        >
          {he ? 'משימה ↗' : 'task ↗'}
        </Link>
      ) : null}
    </div>
  );
}

function DueCell({ item, he }: { item: WorkListItem; he: boolean }) {
  if (!item.dueDate && !item.reviewDate) {
    return <span className="text-on-surface-variant">{tx(T.none, he)}</span>;
  }
  return (
    <div className="flex flex-col gap-[2px] font-label-sm text-label-sm">
      {item.dueDate ? <span className="text-on-surface">{item.dueDate}</span> : null}
      {item.reviewDate ? (
        <span className="text-on-surface-variant">{he ? 'סקירה' : 'review'}: {item.reviewDate}</span>
      ) : null}
    </div>
  );
}

const TH = 'px-sm py-xs text-start font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap';
const TD = 'px-sm py-sm align-top font-body-sm text-body-sm';

function MasterRow({ item, locale }: { item: WorkListItem; locale: Locale }) {
  const he = locale === 'he';
  const meta = STATE_META[item.state];
  return (
    <tr className="border-t border-outline-variant">
      <td className={`${TD} min-w-[14rem]`}>
        <div className="font-title-sm text-title-sm text-on-surface">{item.title}</div>
        <div className="mt-[2px]">
          <StatusBadge state={meta.health} label={tx(meta, he)} size="sm" />
        </div>
      </td>
      <td className={TD}>{item.projectSlug}</td>
      <td className={TD}>{execLabel(item.ownerExecutiveId, he)}</td>
      <td className={TD}>
        <SourceCell item={item} he={he} />
      </td>
      <td className={TD}>{item.approvalStatus}</td>
      <td className={TD}>{item.executionStatus}</td>
      <td className={TD}>
        <StatusBadge state={priorityHealth(item.priority)} label={item.priority} size="sm" />
      </td>
      <td className={TD}>
        <DueCell item={item} he={he} />
      </td>
      <td className={TD}>
        {item.ageDays}
        {tx(T.days, he)}
      </td>
      <td className={`${TD} font-medium`}>
        {item.daysInCurrentState}
        {tx(T.days, he)}
      </td>
      <td className={`${TD} min-w-[12rem]`}>
        <WorkRowActions
          item={{
            id: item.id,
            state: item.state,
            ownerExecutiveId: item.ownerExecutiveId,
            dueDate: item.dueDate,
            reviewDate: item.reviewDate,
          }}
          locale={locale}
        />
        <div className="mt-xs">
          <LineageControls type="work" id={item.id} />
        </div>
      </td>
    </tr>
  );
}

function AttentionCard({ item, locale }: { item: AttentionItem; locale: Locale }) {
  const he = locale === 'he';
  const meta = STATE_META[item.state];
  return (
    <li className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-xs">
            <StatusBadge state={meta.health} label={tx(meta, he)} size="sm" />
            <StatusBadge state={priorityHealth(item.priority)} label={item.priority} size="sm" />
          </div>
          <h3 className="mt-xs font-title-sm text-title-sm text-on-surface">{item.title}</h3>
          <p className="mt-[2px] font-label-sm text-label-sm text-on-surface-variant">
            {execLabel(item.ownerExecutiveId, he)} · {item.projectSlug} ·{' '}
            {SOURCE_LABEL[item.sourceType] ? tx(SOURCE_LABEL[item.sourceType]!, he) : item.sourceType} ·{' '}
            {item.daysInCurrentState}
            {tx(T.days, he)} {he ? 'במצב' : 'in state'}
          </p>
        </div>
        <div className="shrink-0">
          <WorkRowActions
            item={{
              id: item.id,
              state: item.state,
              ownerExecutiveId: item.ownerExecutiveId,
              dueDate: item.dueDate,
              reviewDate: item.reviewDate,
            }}
            locale={locale}
          />
          <div className="mt-xs">
            <LineageControls type="work" id={item.id} />
          </div>
        </div>
      </div>
    </li>
  );
}

export function WorkBoard({
  attention,
  work,
  filters,
}: {
  attention: AttentionItem[];
  work: WorkListItem[];
  filters: React.ReactNode;
}) {
  const { locale } = useTheme();
  const he = locale === 'he';

  // Group the master list by attention state, in the locked display order.
  const groups = STATE_ORDER.map((state) => ({
    state,
    rows: work.filter((w) => w.state === state),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="flex flex-col gap-xl">
      {/* Localized header (client — server can't read the locale) */}
      <header>
        <h1 className="font-display text-display text-on-surface">{tx(T.title, he)}</h1>
        <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">{tx(T.subtitle, he)}</p>
      </header>

      {/* 1 — Attention Queue FIRST (AC12) */}
      <section aria-labelledby="wcc-attention">
        <h2 id="wcc-attention" className="mb-sm font-title-lg text-title-lg text-on-surface">
          {tx(T.attentionTitle, he)}{' '}
          <span className="font-label-md text-label-md text-on-surface-variant">({attention.length})</span>
        </h2>
        {attention.length === 0 ? (
          <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-lg font-body-md text-body-md text-on-surface-variant">
            {tx(T.attentionEmpty, he)}
          </p>
        ) : (
          <ul className="flex flex-col gap-sm">
            {attention.map((a) => (
              <AttentionCard key={a.id} item={a} locale={locale} />
            ))}
          </ul>
        )}
      </section>

      {/* Filters — the CEO's lenses, controlling the master list below */}
      {filters}

      {/* 2 — Master work list, grouped by attention state (AC7) */}
      <section aria-labelledby="wcc-master">
        <h2 id="wcc-master" className="mb-sm font-title-lg text-title-lg text-on-surface">
          {tx(T.masterTitle, he)}{' '}
          <span className="font-label-md text-label-md text-on-surface-variant">({work.length})</span>
        </h2>
        {work.length === 0 ? (
          <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-lg font-body-md text-body-md text-on-surface-variant">
            {tx(T.masterEmpty, he)}
          </p>
        ) : (
          <div className="flex flex-col gap-lg">
            {groups.map((g) => {
              const meta = STATE_META[g.state];
              return (
                <div key={g.state}>
                  <div className="mb-xs flex items-center gap-sm">
                    <StatusBadge state={meta.health} label={tx(meta, he)} size="md" />
                    <span className="font-label-md text-label-md text-on-surface-variant">({g.rows.length})</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low">
                          <th className={TH}>{tx(T.col.title, he)}</th>
                          <th className={TH}>{tx(T.col.business, he)}</th>
                          <th className={TH}>{tx(T.col.owner, he)}</th>
                          <th className={TH}>{tx(T.col.source, he)}</th>
                          <th className={TH}>{tx(T.col.approval, he)}</th>
                          <th className={TH}>{tx(T.col.execution, he)}</th>
                          <th className={TH}>{tx(T.col.priority, he)}</th>
                          <th className={TH}>{tx(T.col.due, he)}</th>
                          <th className={TH}>{tx(T.col.age, he)}</th>
                          <th className={TH}>{tx(T.col.daysInState, he)}</th>
                          <th className={TH}>{tx(T.col.action, he)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows.map((r) => (
                          <MasterRow key={r.id} item={r} locale={locale} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
