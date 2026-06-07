import { NextResponse } from 'next/server';
import { getPlatform } from '../../../../../lib/platform';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * P005A — Reject a TaskProposal.
 *
 * Status → 'rejected', stamped with decided_at + decided_by. No task is
 * created. The proposal row stays so the audit trail records that the CEO
 * saw and declined this commitment.
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
    const decided = await repos.taskProposals.decide(id, {
      status: 'rejected',
      decidedBy,
    });
    return NextResponse.json({ proposal: decided });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to reject proposal' },
      { status: 500 },
    );
  }
}
