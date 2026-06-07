import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, EmptyState } from '../../../../components/Card';
import { DirectiveAutoRefresh } from '../../../../components/DirectiveAutoRefresh';
import { DirectiveEditForm } from '../../../../components/DirectiveEditForm';
import { RunPendingButton } from '../../../../components/RunPendingButton';
import { ProposalDecisionButtons } from '../../../../components/ProposalDecisionButtons';
import { getPlatform } from '../../../../lib/platform';
import { getDirectiveById } from '../../../../lib/ceo-operating-system';
import { relativeTime } from '../../../../lib/format';
import type {
  DirectiveResponseRecord,
  DirectiveResponseStatus,
  ExecutiveId,
  ProposalType,
  Task,
  TaskProposalRecord,
} from '@ai-company/shared-types';

export const dynamic = 'force-dynamic';

const EXECUTIVE_LABEL: Record<string, string> = {
  'chief-of-staff': 'Chief of Staff',
  cto: 'CTO',
  coo: 'COO',
  cfo: 'CFO',
  'vp-marketing': 'VP Marketing',
  'vp-sales': 'VP Sales',
};

const STATUS_COLOR: Record<DirectiveResponseStatus, string> = {
  pending: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  running: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  done: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export default async function DirectiveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const directive = await getDirectiveById(id);
  if (!directive) notFound();

  const { repos } = getPlatform();
  const [responses, allReports, fanoutTasks, proposals] = await Promise.all([
    repos.directiveResponses.listByDirective(directive.id),
    repos.reports.listByDirective(directive.id),
    // P005A — tasks live in ai_company.tasks once the CEO promotes a proposal.
    // Legacy tasks (proposalId null) created before P005A still surface here.
    repos.tasks.list({ directiveId: directive.id }),
    // P005A — every proposal landed for this directive, regardless of status.
    repos.taskProposals.listByDirective(directive.id),
  ]);

  // P007 — pre-compute the completion gate per task so the Tasks card can show
  // a per-row "ready / blocked" badge without a client roundtrip.
  // P008 — same loop also collects outcome counts per task.
  const { evaluateCompletionGate } = await import('@ai-company/doos-core');
  const taskGates = new Map<string, { ready: boolean; reasonCount: number }>();
  const taskOutcomeCounts = new Map<string, number>();
  await Promise.all(
    fanoutTasks.map(async (t) => {
      const [tokens, outcomes] = await Promise.all([
        repos.evidenceTokens.listByTask(t.id),
        repos.taskOutcomes.listByTask(t.id),
      ]);
      const gate = evaluateCompletionGate(t, tokens);
      taskGates.set(t.id, { ready: gate.ready, reasonCount: gate.reasons.length });
      taskOutcomeCounts.set(t.id, outcomes.length);
    }),
  );

  const responseByExec = new Map<string, DirectiveResponseRecord>();
  for (const r of responses) responseByExec.set(r.executiveId, r);

  const reportById = new Map<string, (typeof allReports)[number]>();
  for (const r of allReports) reportById.set(r.id, r);

  // Polling stops once nothing is pending or running. Drain runs in the
  // request thread so polling exists only to refresh after manual edits or
  // out-of-band runs.
  const pendingCount = responses.filter(
    (r) => r.status === 'pending' || r.status === 'running',
  ).length;
  const isExpired = directive.expiresAt
    ? new Date(directive.expiresAt).getTime() < Date.now()
    : false;

  return (
    <div className="space-y-6">
      <DirectiveAutoRefresh pending={pendingCount > 0} />

      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">CEO Directive</div>
          <h1 className="text-2xl font-semibold text-slate-100 mt-1">{directive.title}</h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl whitespace-pre-wrap">
            {directive.directive}
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30">
              {directive.category}
            </Badge>
            <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30">
              {directive.priority}
            </Badge>
            {directive.isOverride && (
              <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30">OVERRIDE</Badge>
            )}
            {directive.targetProjectId && (
              <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30">
                target: {directive.targetProjectId}
              </Badge>
            )}
            {!directive.active && (
              <Badge className="bg-slate-700/30 text-slate-400 border-slate-600/30">
                inactive
              </Badge>
            )}
            {isExpired && (
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                expired {relativeTime(directive.expiresAt!)}
              </Badge>
            )}
            <span className="text-slate-500">
              created {relativeTime(directive.createdAt)} · updated{' '}
              {relativeTime(directive.updatedAt)}
            </span>
          </div>
        </div>
        <Link
          href="/ceo"
          className="text-xs text-slate-400 hover:text-slate-200 whitespace-nowrap"
        >
          ← All directives
        </Link>
      </header>

      <RunPendingButton directiveId={directive.id} pendingCount={pendingCount} />

      <DirectiveEditForm directive={directive} />

      <Card
        title="Executive responses"
        subtitle={
          directive.respondingExecutives.length === 0
            ? 'No responders configured — this directive is informational only.'
            : `${responses.filter((r) => r.status === 'done').length} of ${
                directive.respondingExecutives.length
              } done`
        }
      >
        {directive.respondingExecutives.length === 0 ? (
          <EmptyState>
            Add responding executives via Edit to have the system act on this directive.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {directive.respondingExecutives.map((execId) => {
              const row = responseByExec.get(execId);
              const status: DirectiveResponseStatus = row?.status ?? 'pending';
              const report = row?.executiveReportId
                ? reportById.get(row.executiveReportId)
                : undefined;
              return (
                <li
                  key={execId}
                  className="border border-slate-800 rounded-md p-3 flex items-start gap-3"
                >
                  <div className="min-w-[12rem]">
                    <div className="text-sm text-slate-100 font-medium">
                      {EXECUTIVE_LABEL[execId] ?? execId}
                    </div>
                    <div className="mt-1">
                      <Badge className={STATUS_COLOR[status]}>{status}</Badge>
                    </div>
                    {row?.updatedAt && (
                      <div className="text-xs text-slate-500 mt-1">
                        {relativeTime(row.updatedAt)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    {report ? (
                      <>
                        <div className="text-sm text-slate-100">{report.summary}</div>
                        <div className="text-xs text-slate-500 mt-2">
                          <Link
                            href={`/reports/${report.id}` as never}
                            className="hover:underline text-slate-300"
                          >
                            View full report →
                          </Link>
                        </div>
                      </>
                    ) : row?.status === 'error' ? (
                      <div className="text-xs text-rose-300/90">
                        {row.errorMessage ?? 'Errored without a message.'}
                      </div>
                    ) : row?.status === 'running' ? (
                      <div className="text-xs text-sky-300/80 italic">
                        Calling Anthropic — this row will become "done" once the response writes.
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">
                        Queued. Press "Run pending" above to start.
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AwaitingDecisionCard
        proposals={proposals.filter((p) => p.status === 'proposed')}
      />

      <PromotedTasksCard
        tasks={fanoutTasks}
        proposals={proposals}
        gates={taskGates}
        outcomeCounts={taskOutcomeCounts}
      />

      <DecidedHistoryCard
        proposals={proposals.filter((p) => p.status === 'rejected' || p.status === 'superseded')}
      />

      {allReports.some(
        (r) =>
          !directive.respondingExecutives.includes(r.executiveId as ExecutiveId) &&
          !Array.from(responseByExec.values()).some((x) => x.executiveReportId === r.id),
      ) && (
        <Card
          title="Other linked reports"
          subtitle="Reports tagged with this directive from executives not currently on the responder list."
        >
          <ul className="space-y-3">
            {allReports
              .filter(
                (r) =>
                  !directive.respondingExecutives.includes(r.executiveId as ExecutiveId) &&
                  !Array.from(responseByExec.values()).some(
                    (x) => x.executiveReportId === r.id,
                  ),
              )
              .map((r) => (
                <li key={r.id} className="border border-slate-800 rounded-md p-3">
                  <div className="text-sm text-slate-100">{r.summary}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {r.executiveId} · {relativeTime(r.createdAt)} ·{' '}
                    <Link href={`/reports/${r.id}` as never} className="hover:underline">
                      View
                    </Link>
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

const PROPOSAL_TYPE_COLOR: Record<ProposalType, string> = {
  action: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  research: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  decision: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  escalation: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

/**
 * P005A — Awaiting CEO approval. Per Chief Architect this is the governance
 * boundary: every proposal here is one decision, one audit record. No bulk
 * approve button by design.
 */
function AwaitingDecisionCard({
  proposals,
}: {
  proposals: TaskProposalRecord[];
}) {
  const sorted = [...proposals].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <Card
      title="Proposals awaiting your decision"
      subtitle={
        sorted.length === 0
          ? 'No proposals waiting. Either no executive proposed anything, or you have decided on all proposals for this directive.'
          : `${sorted.length} proposal${sorted.length === 1 ? '' : 's'} awaiting per-proposal approve / reject. Approving creates a task; rejecting records the decision.`
      }
    >
      {sorted.length === 0 ? (
        <EmptyState>
          Proposals from executives land here. Approve to create a task; reject to record the decision without one.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {sorted.map((p) => {
            const payload = p.payload;
            return (
              <li
                key={p.id}
                className="border border-slate-800 rounded-md p-3 flex items-start gap-3"
              >
                <div className="min-w-[10rem]">
                  <Badge className={PROPOSAL_TYPE_COLOR[p.proposalType]}>
                    {p.proposalType}
                  </Badge>
                  <div className="text-xs text-slate-400 mt-2">
                    by {EXECUTIVE_LABEL[p.sourceExecutiveId] ?? p.sourceExecutiveId}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    proposed {relativeTime(p.createdAt)}
                    {p.generation > 1 ? ` · gen ${p.generation}` : ''}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-100">{payload.title}</div>
                  {payload.description && (
                    <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">
                      {payload.description}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-2 uppercase tracking-wide">
                    capability: {payload.capabilityRequired}
                    {payload.priority ? ` · ${payload.priority}` : ''}
                    {payload.dueInDays !== undefined ? ` · due in ${payload.dueInDays}d` : ''}
                  </div>
                </div>
                <ProposalDecisionButtons proposalId={p.id} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/**
 * P005A — Tasks that exist either via promotion (proposal_id set, label
 * "approved by CEO") or as legacy direct-creation rows (proposal_id null,
 * label "legacy"). Per Chief Architect: never rewrite history — the null
 * is the audit trail. Approved tasks include a link back to the proposal
 * that produced them.
 */
function PromotedTasksCard({
  tasks,
  proposals,
  gates,
  outcomeCounts,
}: {
  tasks: Task[];
  proposals: TaskProposalRecord[];
  gates: Map<string, { ready: boolean; reasonCount: number }>;
  outcomeCounts: Map<string, number>;
}) {
  const proposalById = new Map<string, TaskProposalRecord>();
  for (const p of proposals) proposalById.set(p.id, p);
  const sorted = [...tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <Card
      title="Tasks"
      subtitle={
        sorted.length === 0
          ? 'No tasks yet. Approve a proposal above to create one.'
          : `${sorted.length} task${sorted.length === 1 ? '' : 's'} for this directive.`
      }
    >
      {sorted.length === 0 ? (
        <EmptyState>
          Tasks appear here once you approve a proposal or after legacy direct-creation entries.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {sorted.map((t) => {
            const proposal = t.proposalId ? proposalById.get(t.proposalId) : undefined;
            const source = proposal?.sourceExecutiveId ?? null;
            return (
              <li
                key={t.id}
                className="border border-slate-800 rounded-md p-3 flex items-start gap-3"
              >
                <div className="min-w-[10rem]">
                  <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30">
                    {t.status}
                  </Badge>
                  {t.proposalId ? (
                    <Badge className="ml-1 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                      approved
                    </Badge>
                  ) : (
                    <Badge className="ml-1 bg-slate-700/30 text-slate-400 border-slate-600/30">
                      legacy
                    </Badge>
                  )}
                  {source && (
                    <div className="text-xs text-slate-400 mt-2">
                      by {EXECUTIVE_LABEL[source] ?? source}
                    </div>
                  )}
                  {t.dueAt && (
                    <div className="text-xs text-slate-500 mt-1">
                      due {relativeTime(t.dueAt)}
                    </div>
                  )}
                  {(() => {
                    const g = gates.get(t.id);
                    if (!g || t.status === 'completed') return null;
                    return g.ready ? (
                      <Badge className="mt-2 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                        gate: ready
                      </Badge>
                    ) : (
                      <Badge className="mt-2 bg-amber-500/15 text-amber-300 border-amber-500/30">
                        gate: blocked ({g.reasonCount})
                      </Badge>
                    );
                  })()}
                  {(() => {
                    const n = outcomeCounts.get(t.id) ?? 0;
                    return (
                      <Badge
                        className={`mt-2 ${
                          n > 0
                            ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                            : 'bg-slate-700/30 text-slate-400 border-slate-600/30'
                        }`}
                      >
                        {n} outcome{n === 1 ? '' : 's'}
                      </Badge>
                    );
                  })()}
                </div>
                <div className="flex-1">
                  <Link
                    href={`/tasks/${t.id}` as never}
                    className="text-sm text-slate-100 hover:underline"
                  >
                    {t.title}
                  </Link>
                  {t.description && (
                    <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">
                      {t.description}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-2 uppercase tracking-wide">
                    capability: {t.capabilityRequired} · evidence ≥ {t.evidenceRequired.minTier}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/**
 * P005A — Decided proposals that did NOT become tasks. Per Chief Architect:
 * the rejection itself is audit information; the row stays so we can show
 * the CEO declined this commitment.
 */
function DecidedHistoryCard({
  proposals,
}: {
  proposals: TaskProposalRecord[];
}) {
  if (proposals.length === 0) return null;
  const sorted = [...proposals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <Card
      title="Rejected / superseded proposals"
      subtitle="Audit trail — these proposals were seen and not turned into tasks."
    >
      <ul className="space-y-2">
        {sorted.map((p) => (
          <li
            key={p.id}
            className="border border-slate-800 rounded-md p-3 text-xs text-slate-400"
          >
            <span className="text-slate-200">{p.payload.title}</span>
            <span className="ml-2">[{p.status}]</span>
            <span className="ml-2">
              by {EXECUTIVE_LABEL[p.sourceExecutiveId] ?? p.sourceExecutiveId}
            </span>
            <span className="ml-2">
              decided {p.decidedAt ? relativeTime(p.decidedAt) : 'unknown'}
              {p.decidedBy ? ` by ${p.decidedBy}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
