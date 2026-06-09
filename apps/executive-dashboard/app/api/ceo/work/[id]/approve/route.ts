import { NextResponse } from 'next/server';
import { approveAssignedWork, patchWorkFields, type PatchWorkInput } from '../../../../../../lib/executive-os/work-control';
import { workErrorResponse } from '../../../../../../lib/executive-os/work-http';
import { EXECUTIVE_IDS } from '../../../../../../lib/executive-os/executives';

export const dynamic = 'force-dynamic';

/**
 * EPIC-004 (WCC) — approve a work row through the ceo_decisions gate. Optionally
 * complete the row first (owner / due_date / review_date), then approveWork. The
 * gate fires on still-missing owner+date → HTTP 422 NEEDS_CEO_COMPLETION (no
 * ceo_decisions written, no flip). On success: writes the decision, flips
 * proposed→approved, stamps status_changed_at.
 *
 * Body: { ownerExecutiveId?, dueDate?, reviewDate?, notes? }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      ownerExecutiveId?: unknown;
      dueDate?: unknown;
      reviewDate?: unknown;
      notes?: unknown;
    };

    const patch: PatchWorkInput = {};
    if (typeof body.ownerExecutiveId === 'string') {
      if (!(EXECUTIVE_IDS as readonly string[]).includes(body.ownerExecutiveId)) {
        return NextResponse.json({ error: `Unknown executive '${body.ownerExecutiveId}'` }, { status: 400 });
      }
      patch.ownerExecutiveId = body.ownerExecutiveId;
    }
    if (typeof body.dueDate === 'string') patch.dueDate = body.dueDate;
    if (typeof body.reviewDate === 'string') patch.reviewDate = body.reviewDate;
    if (Object.keys(patch).length > 0) await patchWorkFields(id, patch);

    const result = await approveAssignedWork(
      id,
      typeof body.notes === 'string' ? { notes: body.notes } : undefined,
    );
    return NextResponse.json({ approved: result });
  } catch (e) {
    return workErrorResponse(e);
  }
}
