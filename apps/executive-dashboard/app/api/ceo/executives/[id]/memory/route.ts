import { NextResponse } from 'next/server';
import { upsertExecutiveMemory } from '../../../../../../lib/executive-os/executives';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/ceo/executives/[id]/memory
 * Body: { project_slug, current_strategy, known_assumptions: [] }
 * CEO sets/edits an executive's strategy + assumptions per business (§3).
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      project_slug?: string;
      current_strategy?: string | null;
      known_assumptions?: unknown[];
    };
    if (!body.project_slug?.trim()) {
      return NextResponse.json({ error: 'project_slug is required' }, { status: 400 });
    }
    await upsertExecutiveMemory(id, body.project_slug.trim(), {
      currentStrategy: body.current_strategy?.trim() || null,
      knownAssumptions: Array.isArray(body.known_assumptions) ? body.known_assumptions : [],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save memory' },
      { status: 500 },
    );
  }
}
