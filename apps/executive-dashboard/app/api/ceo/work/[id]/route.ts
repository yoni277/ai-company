import { NextResponse } from 'next/server';
import { patchWorkFields, type PatchWorkInput } from '../../../../../lib/executive-os/work-control';
import { workErrorResponse } from '../../../../../lib/executive-os/work-http';
import { EXECUTIVE_IDS } from '../../../../../lib/executive-os/executives';

export const dynamic = 'force-dynamic';

/**
 * EPIC-004 (WCC) — set owner / due_date / review_date on a work row. Supplying
 * the missing owner+date clears the derived "Needs CEO Completion" state. NOT a
 * status transition → does not stamp status_changed_at. Pass null to clear a
 * date.
 *
 * Body: { ownerExecutiveId?, dueDate?: string|null, reviewDate?: string|null }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      ownerExecutiveId?: unknown;
      dueDate?: unknown;
      reviewDate?: unknown;
    };

    const patch: PatchWorkInput = {};
    if (typeof body.ownerExecutiveId === 'string') {
      if (!(EXECUTIVE_IDS as readonly string[]).includes(body.ownerExecutiveId)) {
        return NextResponse.json({ error: `Unknown executive '${body.ownerExecutiveId}'` }, { status: 400 });
      }
      patch.ownerExecutiveId = body.ownerExecutiveId;
    }
    if (body.dueDate === null || typeof body.dueDate === 'string') patch.dueDate = body.dueDate as string | null;
    if (body.reviewDate === null || typeof body.reviewDate === 'string') {
      patch.reviewDate = body.reviewDate as string | null;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Provide at least one of ownerExecutiveId, dueDate, reviewDate' }, { status: 400 });
    }

    const work = await patchWorkFields(id, patch);
    return NextResponse.json({ work });
  } catch (e) {
    return workErrorResponse(e);
  }
}
