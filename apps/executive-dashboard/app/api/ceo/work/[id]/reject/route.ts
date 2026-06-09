import { NextResponse } from 'next/server';
import { rejectAssignedWork } from '../../../../../../lib/executive-os/work-control';
import { workErrorResponse } from '../../../../../../lib/executive-os/work-http';

export const dynamic = 'force-dynamic';

/** EPIC-004 (WCC) — reject a proposed work row (stamps status_changed_at). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await rejectAssignedWork(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return workErrorResponse(e);
  }
}
