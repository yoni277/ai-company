import { NextResponse } from 'next/server';
import type { TaskProposal } from '@ai-company/shared-types';
import { getPlatform } from '../../../../../lib/platform';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * P005A — Promote a TaskProposal to a Task.
 *
 * Per Chief Architect: this is the governance boundary. The CEO is approving
 * a commitment, not a report. Per-proposal only — no bulk approval.
 *
 * Body: { decidedBy: string }
 * Effect:
 *   1. Mark task_proposals.status = 'approved' (decided_at + decided_by stamped).
 *   2. Insert ai_company.tasks with proposal_id linking back. dueAt is
 *      computed from payload.dueInDays at promotion time, not at proposal
 *      emission time — the CEO's clock is the one that matters.
 *   3. Return both the proposal and the new task so the UI updates atomically.
 *
 * The proposal must currently be in status 'proposed'. The DB-level
 * single-row update in the repository's `decide` method protects against
 * double-promotion races (concurrent click submits will see the row already
 * decided and fail).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { decidedBy?: string };
    const decidedBy = typeof body.decidedBy === 'string' && body.decidedBy.trim()
      ? body.decidedBy.trim()
      : 'ceo';

    const { repos } = getPlatform();

    const proposal = await repos.taskProposals.getById(id);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }
    if (proposal.status !== 'proposed') {
      return NextResponse.json(
        { error: `Proposal already decided (status=${proposal.status})` },
        { status: 409 },
      );
    }

    // Need the directive to find the objective the task will live under.
    const directive = await repos.directiveResponses.listByDirective(proposal.directiveId);
    void directive; // keep the import warm; objective is on the directive proper
    const directiveRow = await getDirectiveObjectiveId(repos, proposal.directiveId);
    if (!directiveRow?.objectiveId) {
      return NextResponse.json(
        { error: 'Directive has no objective; cannot promote proposal to task.' },
        { status: 422 },
      );
    }

    const decided = await repos.taskProposals.decide(id, {
      status: 'approved',
      decidedBy,
    });

    const payload: TaskProposal = decided.payload;
    const dueAt =
      payload.dueInDays !== undefined
        ? new Date(Date.now() + payload.dueInDays * 86_400_000).toISOString()
        : null;

    const task = await repos.tasks.create({
      objectiveId: directiveRow.objectiveId,
      directiveId: decided.directiveId,
      title: payload.title,
      description: payload.description ?? null,
      capabilityRequired: payload.capabilityRequired,
      ownerId: null,
      ...(payload.evidenceRequired ? { evidenceRequired: payload.evidenceRequired } : {}),
      dueAt,
      proposalId: decided.id,
    });

    return NextResponse.json({ proposal: decided, task });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to promote proposal' },
      { status: 500 },
    );
  }
}

/**
 * Tiny helper — the directive responder repository indexes by directive_id
 * but we need the objective_id off the directive itself. Keep this local
 * rather than adding a new repo method until a second consumer needs it.
 */
async function getDirectiveObjectiveId(
  repos: ReturnType<typeof getPlatform>['repos'],
  directiveId: string,
): Promise<{ objectiveId: string | null } | null> {
  // The platform exposes directives via a higher-level lib module, but
  // route handlers are colocated with the same Supabase client. Read the
  // ceo_directives row via the existing executive-team / ceo-os helper.
  const { getDirectiveById } = await import('../../../../../lib/ceo-operating-system');
  const directive = await getDirectiveById(directiveId);
  return directive ? { objectiveId: directive.objectiveId } : null;
}
