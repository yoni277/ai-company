import { NextResponse } from 'next/server';
import { loadSituationRoom } from '../../../../lib/executive-os/situation-room';

export const dynamic = 'force-dynamic';

/**
 * EPIC-004 Phase 5 (Situation Room) — one composed read for the five-question
 * CEO summary: attention queue (same selector as /work), work-by-executive,
 * blocked/oldest-stuck, decision queue, and the evidence-gated winning block
 * (spine outcomes + businessEvidence:null until WDIP). project_slug-scoped;
 * read-only; empty business → honest-empty Room.
 */
export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get('project_slug') ?? undefined;
    const situation = await loadSituationRoom(slug);
    return NextResponse.json({ situation });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load situation room' },
      { status: 500 },
    );
  }
}
