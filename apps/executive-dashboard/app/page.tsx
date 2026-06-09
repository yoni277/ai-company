/**
 * D061 / P056 — Root route = decision-centric Home (Wave 1 ship / cutover).
 *
 * Home REPLACES the legacy `/` Overview as the company's landing surface (UI
 * Migration Matrix). The previous root was a P055 mitigation redirect to
 * `/projects` (the old `/ceo` landing froze the renderer); Home carries no such
 * heavy client panel — P051–P055 repro confirmed zero regressions — so it is
 * safe as the root landing. The legacy Overview remains reachable at `/overview`
 * (nothing lost). Inbox stays at `/inbox`.
 *
 * Server component: reads real data via loadHomeData() (repos direct, no
 * self-HTTP) on the P056.1 tokens. Constraints intact: force-dynamic, error
 * boundaries (root app/error.tsx), prefetch={false} nav, RTL/a11y.
 *
 * Gate: status legible <10s · Approve 1-click (DecisionQueueItem) · a11y parity ·
 * no all-data-on-load (ActivityFeed lazy) · empty-state-valid (every section has
 * an explicit zero state; no auto-seed).
 */

import type { ReactNode } from 'react';
import {
  ActivityFeed,
  ProjectCard,
  RiskCard,
  StatusBadge,
  Surface,
} from '../components/ds';
import { AIChiefOfStaffPanel } from '../components/ds/AIChiefOfStaffPanel';
import { DecisionQueueItem } from '../components/executive-os/DecisionQueueItem';
import { WorkInitiationBar } from '../components/executive-os/WorkInitiationBar';
import { NewMeetingButton } from '../components/executive-os/NewMeetingButton';
import { loadHomeData, loadExecutives } from '../lib/executive-os';
import { listMeetingTypes, listBusinessSlugs } from '../lib/executive-os/meetings';

export const dynamic = 'force-dynamic';

export default async function RootHomePage() {
  const { briefing, queue, criticalRisks, wins, activity, projects, counts } =
    await loadHomeData();
  const executives = loadExecutives();
  const [meetingTypes, businesses] = await Promise.all([listMeetingTypes(), listBusinessSlugs()]);

  const [lead, ...rest] = queue;

  return (
    <div className="ds-surface min-h-screen rounded-lg px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-5xl">
        <header className="mb-xl flex flex-wrap items-start justify-between gap-md">
          <div>
            <h1 className="font-display text-display text-on-surface">Home</h1>
            <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">
              Your company at a glance — decisions first.
            </p>
          </div>
          {/* L29 + L30 — the CEO's input controls: assign work, or convene a meeting */}
          <div className="flex flex-wrap items-center gap-sm">
            <WorkInitiationBar executives={executives} />
            <NewMeetingButton types={meetingTypes} businesses={businesses} executives={executives} />
          </div>
        </header>

        {/* Executive briefing — embeds the single most-urgent decision */}
        <section className="mb-xl">
          <AIChiefOfStaffPanel
            headline={briefing.headline}
            summary={briefing.summary}
            generatedAt={briefing.generatedAt ?? undefined}
            signals={[
              { state: counts.decisions > 0 ? 'attention' : 'healthy', text: `${counts.decisions} ${counts.decisions === 1 ? 'decision' : 'decisions'} waiting` },
              { state: counts.criticalRisks > 0 ? 'action' : 'healthy', text: `${counts.criticalRisks} critical ${counts.criticalRisks === 1 ? 'risk' : 'risks'}` },
              { state: 'healthy', text: `${counts.healthyProjects}/${counts.projects} projects healthy` },
            ]}
            metrics={[
              { label: 'Decisions', value: counts.decisions },
              { label: 'Open risks', value: counts.risks },
              { label: 'Projects', value: counts.projects },
              { label: 'Wins (recent)', value: counts.wins },
            ]}
          >
            {lead ? <DecisionQueueItem item={lead} /> : null}
          </AIChiefOfStaffPanel>
        </section>

        {/* Waiting for decision (the rest of the queue) */}
        <Section title="Waiting for Decision" count={queue.length}>
          {queue.length === 0 ? (
            <Empty>Nothing is waiting on you. Inbox zero.</Empty>
          ) : rest.length === 0 ? (
            <Empty>The one decision above is all that&apos;s waiting.</Empty>
          ) : (
            <div className="grid gap-lg lg:grid-cols-2">
              {rest.map((item) => (
                <DecisionQueueItem key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </Section>

        {/* Critical risks */}
        <Section title="Critical Risks" count={criticalRisks.length}>
          {criticalRisks.length === 0 ? (
            <Empty>No critical or high-severity risks are open.</Empty>
          ) : (
            <div className="grid gap-lg lg:grid-cols-2">
              {criticalRisks.map((r) => (
                <RiskCard
                  key={r.id}
                  description={r.description}
                  severity={r.severity}
                  status={r.status}
                  recordedBy={r.recordedBy}
                  context={r.context ?? undefined}
                  generation={r.generation}
                />
              ))}
            </div>
          )}
        </Section>

        {/* Recent wins */}
        <Section title="Recent Wins" count={wins.length}>
          {wins.length === 0 ? (
            <Empty>No completed work yet.</Empty>
          ) : (
            <Surface>
              <ul className="space-y-0">
                {wins.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center gap-sm border-b border-outline-variant py-sm last:border-b-0"
                  >
                    <StatusBadge state="healthy" label="Done" size="sm" />
                    <span className="min-w-0 flex-1 truncate font-body-md text-body-md text-on-surface">
                      {w.title}
                    </span>
                    {w.completedBy ? (
                      <span className="font-label-sm text-label-sm text-outline">{w.completedBy}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Surface>
          )}
        </Section>

        {/* Activity pulse — lazy */}
        <Section title="Activity Pulse" count={activity.length}>
          {activity.length === 0 ? (
            <Empty>No recent activity.</Empty>
          ) : (
            <Surface>
              <ActivityFeed items={activity} pageSize={5} />
            </Surface>
          )}
        </Section>

        {/* Project health */}
        <Section title="Project Health" count={projects.length}>
          {projects.length === 0 ? (
            <Empty>No projects registered yet.</Empty>
          ) : (
            <div className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard
                  key={p.slug}
                  name={p.name}
                  slug={p.slug}
                  description={p.description}
                  lifecycle={p.lifecycle}
                  health={p.health}
                  bottleneck={p.bottleneck}
                  openRecommendations={p.openRecommendations}
                />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="mb-xl">
      <h2 className="mb-md flex items-baseline gap-sm font-headline-md text-headline-md text-on-surface">
        {title}
        {typeof count === 'number' ? (
          <span className="font-label-sm text-label-sm text-outline">{count}</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="font-body-md text-body-md italic text-on-surface-variant">{children}</p>
  );
}
