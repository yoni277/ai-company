import { NextResponse } from 'next/server';
import { synthesizeMeetingById } from '../../../../../../lib/executive-os/meetings';

// Long-running: holds the response open while R4 synthesis (LLM) runs.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * OF-008 — POST /api/ceo/meetings/[id]/synthesize. Resume a stalled
 * `in_discussion` meeting (re-run R4 from the persisted discussion) or request
 * the CoS synthesis, driving it to `summarized` with the conversion guarantee
 * (≥1 owned proposed work, or an explicit honest no-action). Never a silent stall.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await synthesizeMeetingById(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to synthesize meeting' },
      { status: 500 },
    );
  }
}
