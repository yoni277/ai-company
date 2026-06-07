import Link from 'next/link';
import { notFound } from 'next/navigation';
import { evaluateCompletionGate } from '@ai-company/doos-core';
import { getPlatform } from '../../../lib/platform';
import { Badge, Card } from '../../../components/Card';
import { TaskEvidencePanel } from '../../../components/TaskEvidencePanel';
import { TaskOutcomesPanel } from '../../../components/TaskOutcomesPanel';
import { relativeTime } from '../../../lib/format';

export const dynamic = 'force-dynamic';

/**
 * P007 — Task detail + evidence + completion gate.
 *
 * Server-rendered: loads the task, its evidence tokens, and evaluates the
 * gate. Hands all three to the client panel which handles attach/complete
 * interactions. Per Chief Architect: no auto-completion, no AI interpretation
 * of evidence, no bulk operations.
 */
export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { repos } = getPlatform();

  const task = await repos.tasks.getById(id);
  if (!task) notFound();

  const [tokens, objective, outcomes] = await Promise.all([
    repos.evidenceTokens.listByTask(id),
    repos.objectives.getById(task.objectiveId),
    repos.taskOutcomes.listByTask(id),
  ]);

  const gate = evaluateCompletionGate(task, tokens);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs text-slate-500 uppercase tracking-wide">Task</div>
        <h1 className="text-2xl font-semibold text-slate-100 mt-1">{task.title}</h1>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30">{task.status}</Badge>
          <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30">
            capability: {task.capabilityRequired}
          </Badge>
          <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30">
            evidence ≥ {task.evidenceRequired.minTier} × {task.evidenceRequired.minCount}
          </Badge>
          {task.dueAt && (
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">
              due {relativeTime(task.dueAt)}
            </Badge>
          )}
          {task.proposalId && (
            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              approved proposal
            </Badge>
          )}
          {!task.proposalId && (
            <Badge className="bg-slate-700/30 text-slate-400 border-slate-600/30">
              legacy (no proposal)
            </Badge>
          )}
        </div>
        <div className="mt-3 text-sm text-slate-400">
          {objective && (
            <>
              objective:{' '}
              <span className="text-slate-200">{objective.title}</span>
            </>
          )}
          {task.directiveId && (
            <>
              {' · '}
              <Link
                href={`/ceo/directives/${task.directiveId}` as never}
                className="text-sky-300 hover:underline"
              >
                directive →
              </Link>
            </>
          )}
        </div>
        {task.description && (
          <p className="mt-3 text-sm text-slate-300 whitespace-pre-wrap">{task.description}</p>
        )}
      </header>

      <Card
        title="Evidence + completion gate"
        subtitle="Per-record attach. Tier is derived from evidence kind (not selectable). Completion is blocked when the gate fails."
      >
        <TaskEvidencePanel
          taskId={task.id}
          initialTokens={tokens}
          initialGate={gate}
          taskStatus={task.status}
        />
      </Card>

      <Card
        title="Outcomes"
        subtitle='Did the work matter? Append-only, measurable, time-bound facts. Outcomes ≠ Evidence.'
      >
        <TaskOutcomesPanel
          taskId={task.id}
          initialOutcomes={outcomes}
          taskStatus={task.status}
        />
      </Card>
    </div>
  );
}
