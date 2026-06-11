/**
 * L30 — Meetings list (spec §6). Scoped, newest first; links to detail.
 * Optional ?project_slug= filter.
 */

import Link from 'next/link';
import { StatusBadge } from '../../components/ds';
import { ChevronEndIcon } from '../../components/ds/icons';
import { listMeetings } from '../../lib/executive-os/meetings';
import { InspectorLayout } from '../../components/executive-os/lineage/Inspector';
import { LineageControls } from '../../components/executive-os/lineage/LineageControls';

export const dynamic = 'force-dynamic';

const NAME: Record<string, string> = {
  'chief-of-staff': 'CoS', cto: 'CTO', coo: 'COO', cfo: 'CFO', 'vp-marketing': 'VP-Mktg', 'vp-sales': 'VP-Sales',
};

function statusState(status: string): 'healthy' | 'attention' | 'action' | 'neutral' {
  if (status === 'approved' || status === 'completed') return 'healthy';
  if (status === 'summarized') return 'attention';
  if (status === 'cancelled') return 'action';
  return 'neutral';
}

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ project_slug?: string }>;
}) {
  const { project_slug } = await searchParams;
  const meetings = await listMeetings(project_slug ? { projectSlug: project_slug } : {});

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-4xl">
        <header className="mb-xl">
          <h1 className="font-display text-display text-on-surface">Meetings</h1>
          <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">
            Executive deliberations — where the team debates a decision and proposes work for your approval.
          </p>
        </header>

        {meetings.length === 0 ? (
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-xl text-center">
            <p className="font-title-lg text-title-lg text-on-surface">No meetings yet</p>
            <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
              Start one from Home with “+ New Meeting”. Nothing is auto-created.
            </p>
          </div>
        ) : (
          <InspectorLayout>
            <ul className="space-y-sm">
              {meetings.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest transition hover:shadow-ambient"
                >
                  <Link
                    href={`/meetings/${m.id}` as never}
                    prefetch={false}
                    className="flex items-center justify-between gap-md p-lg"
                  >
                    <div className="min-w-0">
                      <p className="font-label-sm text-label-sm uppercase text-outline">{m.type} · {m.projectSlug}</p>
                      <p className="truncate font-title-lg text-title-lg text-on-surface">{m.topic}</p>
                      <p className="font-label-sm text-label-sm text-outline">{m.participants.map((p) => NAME[p] ?? p).join(' · ')}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-sm">
                      <StatusBadge state={statusState(m.status)} label={m.status} size="sm" />
                      <ChevronEndIcon className="h-4 w-4 text-outline rtl:-scale-x-100" />
                    </div>
                  </Link>
                  <div className="border-t border-outline-variant px-lg py-sm">
                    <LineageControls type="meeting" id={m.id} />
                  </div>
                </li>
              ))}
            </ul>
          </InspectorLayout>
        )}
      </div>
    </div>
  );
}
