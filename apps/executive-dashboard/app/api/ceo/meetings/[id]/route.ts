import { NextResponse } from 'next/server';
import { getMeeting } from '../../../../../lib/executive-os/meetings';

export const dynamic = 'force-dynamic';

/** GET /api/ceo/meetings/[id] — full meeting (discussion, summary, decisions, proposed work). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const meeting = await getMeeting(id);
    if (!meeting) return NextResponse.json({ error: 'meeting not found' }, { status: 404 });
    return NextResponse.json({ meeting });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load meeting' },
      { status: 500 },
    );
  }
}
