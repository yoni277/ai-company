import { NextResponse } from 'next/server';
import { runMeetingById } from '../../../../../../lib/executive-os/meetings';

// Long-running: holds the response open while the orchestrator drains R0–R4
// (LLM fan-out per round). Same pattern as the directive run-pending route.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** POST /api/ceo/meetings/[id]/run — run the orchestration (R0–R4) → summarized. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await runMeetingById(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to run meeting' },
      { status: 500 },
    );
  }
}
