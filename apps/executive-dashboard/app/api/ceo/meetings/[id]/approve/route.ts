import { NextResponse } from 'next/server';
import { approveMeeting, type ApproveVerdict } from '../../../../../../lib/executive-os/meetings';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ceo/meetings/[id]/approve — the single side-effect gate (cond #4).
 * Body: { decisions: [{ index, verdict: 'approve' | 'reject' }] }
 * Per approved decision: writes a ceo_decisions row and flips its assigned_work
 * proposed→approved; reject → rejected. Meeting → approved (≥1) / cancelled (all
 * rejected). No assigned_work is approved without a ceo_decisions row.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      decisions?: Array<{ index: number; verdict: 'approve' | 'reject' }>;
    };
    const verdicts: ApproveVerdict[] = Array.isArray(body.decisions)
      ? body.decisions
          .filter((d) => typeof d.index === 'number' && (d.verdict === 'approve' || d.verdict === 'reject'))
          .map((d) => ({ index: d.index, verdict: d.verdict }))
      : [];
    if (verdicts.length === 0) {
      return NextResponse.json({ error: 'decisions[] with index + verdict required' }, { status: 400 });
    }
    const result = await approveMeeting(id, verdicts);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to approve meeting' },
      { status: 500 },
    );
  }
}
