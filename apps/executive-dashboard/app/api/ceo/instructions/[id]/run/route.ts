import { NextResponse } from 'next/server';
import { runInstruction } from '../../../../../../lib/executive-os/instructions';

// The executive's response is a single LLM round-trip (reuses the meeting persona
// seam). Hold the response open like the directive/meeting run routes.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** POST /api/ceo/instructions/[id]/run — the target executive acknowledges + responds. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await runInstruction(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to run instruction' },
      { status: 500 },
    );
  }
}
