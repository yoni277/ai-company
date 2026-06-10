import { NextResponse } from 'next/server';
import { respondToCeoInput } from '../../../../../../lib/executive-os/instructions';

// Long-running: re-invokes the executive (LLM) with the CEO's reply in context.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * OF-005 — POST /api/ceo/instructions/[id]/respond { ceoResponse }. The CEO
 * answers an executive's clarifying question in-thread: stores ceo_response,
 * clears awaiting_ceo_input, re-invokes the executive, and returns the continued
 * response (or the next question if still blocked). Closes the stall.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { ceoResponse?: unknown };
    if (typeof body.ceoResponse !== 'string' || !body.ceoResponse.trim()) {
      return NextResponse.json({ error: 'ceoResponse is required' }, { status: 400 });
    }
    const result = await respondToCeoInput(id, body.ceoResponse);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to respond to instruction' },
      { status: 500 },
    );
  }
}
