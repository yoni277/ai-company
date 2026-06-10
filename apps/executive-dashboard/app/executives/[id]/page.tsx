/**
 * L31 + EPIC-004 Phase 6 — Executive Desktop ("how is THIS person doing?").
 * Enhanced IN PLACE: the five sections (Identity · Current Work · Performance ·
 * Communication · Timeline) render from the L31 payload, now backed by the SHARED
 * work-control-core classifier (Current Work groups exactly as /work). The L31
 * actions (Send Instruction, memory edit, meetings) are preserved. Scoped by
 * (executive_id, project_slug).
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTag } from '../../../components/ds';
import { ChevronEndIcon } from '../../../components/ds/icons';
import { BusinessSelector } from '../../../components/executive-os/BusinessSelector';
import { SendInstructionButton } from '../../../components/executive-os/SendInstructionButton';
import { RequestReportButton } from '../../../components/executive-os/RequestReportButton';
import { NewMeetingButton } from '../../../components/executive-os/NewMeetingButton';
import { ExecutiveMemoryPanel } from '../../../components/executive-os/ExecutiveMemoryPanel';
import { ExecutiveDesktop } from '../../../components/executive-os/executive-desktop/ExecutiveDesktop';
import { loadExecutiveWorkspace } from '../../../lib/executive-os/executives';
import { loadExecutiveContextPacks } from '../../../lib/executive-os/context-pack-deps';
import { loadExecutives } from '../../../lib/executive-os';
import { listMeetingTypes, listBusinessSlugs } from '../../../lib/executive-os/meetings';

export const dynamic = 'force-dynamic';

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

  const [ws, meetingTypes, executives, contextPacks] = await Promise.all([
    slug ? loadExecutiveWorkspace(id, slug) : Promise.resolve(null),
    listMeetingTypes(),
    Promise.resolve(loadExecutives()),
    slug ? loadExecutiveContextPacks(id, slug) : Promise.resolve([]),
  ]);
  if (!ws) notFound();

  const base = `/executives/${id}`;

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/executives?project_slug=${encodeURIComponent(slug)}` as never}
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-xs font-label-md text-label-md text-primary hover:underline"
        >
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

        {/* L31 actions — preserved (no manage verbs duplicated; work items link to /work) */}
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

        {/* The five sections (EPIC-004 Phase 6) — Identity embeds the L31 memory edit. */}
        <ExecutiveDesktop
          ws={ws}
          slug={slug}
          contextPacks={contextPacks}
          memorySlot={
            <ExecutiveMemoryPanel
              executiveId={ws.executiveId}
              projectSlug={slug}
              strategy={ws.memory?.currentStrategy ?? null}
              assumptions={ws.memory?.knownAssumptions ?? []}
              updatedAt={ws.memory?.updatedAt ?? null}
            />
          }
        />

        <p className="mt-xl border-t border-outline-variant pt-lg text-center font-label-sm text-label-sm uppercase tracking-widest text-outline">
          <DataTag kind="DERIVED" />{' '}
          <span className="ms-sm align-middle">read-aggregation · scoped (executive · {slug})</span>
        </p>
      </div>
    </div>
  );
}
