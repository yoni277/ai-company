/**
 * L31 — Executive Workspace (spec §5/§7). Everything an executive holds for one
 * business + the management actions. Scoped by (executive_id, project_slug).
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusBadge, DataTag } from '../../../components/ds';
import { ChevronEndIcon } from '../../../components/ds/icons';
import { BusinessSelector } from '../../../components/executive-os/BusinessSelector';
import { SendInstructionButton } from '../../../components/executive-os/SendInstructionButton';
import { RequestReportButton } from '../../../components/executive-os/RequestReportButton';
import { NewMeetingButton } from '../../../components/executive-os/NewMeetingButton';
import { ExecutiveMemoryPanel } from '../../../components/executive-os/ExecutiveMemoryPanel';
import { loadExecutiveWorkspace, type WorkItem } from '../../../lib/executive-os/executives';
import { loadExecutives } from '../../../lib/executive-os';
import { listMeetingTypes, listBusinessSlugs } from '../../../lib/executive-os/meetings';

export const dynamic = 'force-dynamic';

const SOURCE_TONE: Record<string, string> = {
  directive: 'bg-primary-container/10 text-primary border-primary/30',
  meeting: 'bg-secondary-container/40 text-secondary border-secondary/30',
  instruction: 'bg-tertiary-container/15 text-tertiary border-tertiary/30',
};

export default async function ExecutiveWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ project_slug?: string }>;
}) {
  const { id } = await params;
  const businesses = await listBusinessSlugs();
  const { project_slug } = await searchParams;
  const slug = project_slug || businesses[0]?.slug || '';

  const [ws, meetingTypes, executives] = await Promise.all([
    slug ? loadExecutiveWorkspace(id, slug) : Promise.resolve(null),
    listMeetingTypes(),
    Promise.resolve(loadExecutives()),
  ]);
  if (!ws) notFound();

  const base = `/executives/${id}`;

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-5xl">
        <Link href={`/executives?project_slug=${encodeURIComponent(slug)}` as never} prefetch={false} className="inline-flex min-h-11 items-center gap-xs font-label-md text-label-md text-primary hover:underline">
          <ChevronEndIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
          Executives
        </Link>

        <header className="mt-sm mb-lg flex flex-wrap items-start justify-between gap-md">
          <div className="min-w-0">
            <h1 className="font-display text-display text-on-surface">{ws.executiveName}</h1>
            {ws.charter ? (
              <p className="mt-xs font-body-lg text-body-lg italic text-on-surface-variant">“{ws.charter.mandate}”</p>
            ) : null}
            <p className="mt-xs font-label-sm text-label-sm uppercase text-outline">{ws.projectName ?? slug}</p>
          </div>
          <div className="flex flex-col items-end gap-sm">
            <BusinessSelector businesses={businesses} current={slug} basePath={base} />
            {ws.charter ? <DataTag kind="NEW FIELD" /> : null}
          </div>
        </header>

        {/* Actions */}
        <div className="mb-xl flex flex-wrap items-start gap-sm">
          <SendInstructionButton projectSlug={slug} executiveId={ws.executiveId} executiveName={ws.executiveName} />
          <NewMeetingButton
            types={meetingTypes}
            businesses={businesses}
            executives={executives}
            defaultSlug={slug}
            defaultParticipant={ws.executiveId}
            label="Start Meeting"
            variant="secondary"
          />
          <RequestReportButton executiveId={ws.executiveId} executiveName={ws.executiveName} projectSlug={slug} />
        </div>

        {/* KPIs */}
        <section className="mb-xl grid grid-cols-2 gap-lg sm:grid-cols-4">
          <Kpi label="Open work" value={ws.kpis.openWork} />
          <Kpi label="In progress" value={ws.kpis.inProgress} />
          <Kpi label="Done" value={ws.kpis.done} tone="text-healthy" />
          <Kpi label="Overdue" value={ws.kpis.overdue} tone={ws.kpis.overdue > 0 ? 'text-action' : 'text-on-surface'} />
        </section>

        {/* Memory */}
        <section className="mb-xl">
          <ExecutiveMemoryPanel
            executiveId={ws.executiveId}
            projectSlug={slug}
            strategy={ws.memory?.currentStrategy ?? null}
            assumptions={ws.memory?.knownAssumptions ?? []}
            updatedAt={ws.memory?.updatedAt ?? null}
          />
        </section>

        {/* Assigned work board (the one spine — directive/meeting/instruction) */}
        <Section title="Assigned Work" count={ws.assignedWork.items.length}>
          {ws.assignedWork.items.length === 0 ? (
            <Empty>No work assigned yet.</Empty>
          ) : (
            <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
              <WorkColumn title="Pending decision" items={ws.assignedWork.groups.proposed} />
              <WorkColumn title="Approved · open" items={ws.assignedWork.groups.approvedOpen} />
              <WorkColumn title="In progress" items={ws.assignedWork.groups.inProgress} />
              <WorkColumn title="Done" items={ws.assignedWork.groups.done} />
            </div>
          )}
        </Section>

        <div className="grid gap-lg lg:grid-cols-2">
          <Section title="Objectives" count={ws.objectives.length}>
            {ws.objectives.length === 0 ? <Empty>None.</Empty> : (
              <ul className="space-y-xs">{ws.objectives.map((o) => <Row key={o.id} text={o.title} tag={o.status} />)}</ul>
            )}
          </Section>
          <Section title="Risks" count={ws.risks.length}>
            {ws.risks.length === 0 ? <Empty>None.</Empty> : (
              <ul className="space-y-xs">{ws.risks.map((r) => <Row key={r.id} text={r.description} tag={r.severity} />)}</ul>
            )}
          </Section>
        </div>

        <Section title="Meetings" count={ws.meetings.length}>
          {ws.meetings.length === 0 ? <Empty>None.</Empty> : (
            <ul className="space-y-sm">
              {ws.meetings.map((mm) => (
                <li key={mm.id}>
                  <Link href={`/meetings/${mm.id}` as never} prefetch={false} className="flex items-center justify-between gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md hover:shadow-ambient">
                    <span className="min-w-0 truncate font-body-md text-body-md text-on-surface">{mm.topic}</span>
                    <span className="font-label-sm text-label-sm uppercase text-outline">{mm.type} · {mm.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Reports" count={ws.reports.length}>
          {ws.reports.length === 0 ? <Empty>None.</Empty> : (
            <ul className="space-y-xs">{ws.reports.map((r) => <Row key={r.id} text={r.summary} tag={r.reportType} />)}</ul>
          )}
        </Section>

        {ws.timeline.length > 0 ? (
          <Section title="Activity">
            <ul className="space-y-xs">
              {ws.timeline.map((t, i) => (
                <li key={i} className="flex items-start gap-sm font-body-md text-body-md text-on-surface-variant">
                  <span className="font-label-sm text-label-sm uppercase text-outline">{t.at.slice(0, 10)}</span>
                  <span className="font-label-sm text-label-sm uppercase text-outline">{t.kind}</span>
                  <span className="min-w-0 flex-1 truncate text-on-surface">{t.label}</span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <p className="mt-xl border-t border-outline-variant pt-lg text-center font-label-sm text-label-sm uppercase tracking-widest text-outline">
          <DataTag kind="DERIVED" /> <span className="ms-sm align-middle">read-aggregation · scoped (executive · {slug})</span>
        </p>
      </div>
    </div>
  );
}

function WorkColumn({ title, items }: { title: string; items: WorkItem[] }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
      <p className="mb-sm font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{title} · {items.length}</p>
      {items.length === 0 ? (
        <p className="font-label-sm text-label-sm italic text-outline">—</p>
      ) : (
        <ul className="space-y-sm">
          {items.map((w) => (
            <li key={w.id} className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
              <div className="flex items-start justify-between gap-sm">
                <span className="min-w-0 font-body-md text-body-md text-on-surface">{w.title}</span>
                <span className={`shrink-0 rounded-sm border px-sm py-[1px] font-label-sm text-label-sm ${SOURCE_TONE[w.sourceType] ?? 'border-outline-variant text-on-surface-variant'}`}>{w.sourceType}</span>
              </div>
              <p className="mt-xs font-label-sm text-label-sm text-outline">{w.priority}{w.dueDate ? ` · due ${w.dueDate}` : ''}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, value, tone = 'text-on-surface' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
      <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">{label}</p>
      <p className={`mt-xs font-display text-display ${tone}`}>{value}</p>
    </div>
  );
}

function Row({ text, tag }: { text: string; tag?: string }) {
  return (
    <li className="flex items-start justify-between gap-sm rounded border border-outline-variant bg-surface-container-lowest p-sm">
      <span className="min-w-0 font-body-md text-body-md text-on-surface">{text}</span>
      {tag ? <span className="shrink-0 font-label-sm text-label-sm uppercase text-outline">{tag}</span> : null}
    </li>
  );
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
