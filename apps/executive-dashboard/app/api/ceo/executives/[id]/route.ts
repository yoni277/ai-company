import { NextResponse } from 'next/server';
import { loadExecutiveWorkspace } from '../../../../../lib/executive-os/executives';

export const dynamic = 'force-dynamic';

/** GET /api/ceo/executives/[id]?project_slug= — full workspace aggregation (scoped). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const slug = new URL(request.url).searchParams.get('project_slug');
    if (!slug) return NextResponse.json({ error: 'project_slug is required' }, { status: 400 });
    const workspace = await loadExecutiveWorkspace(id, slug);
    if (!workspace) return NextResponse.json({ error: 'executive or business not found' }, { status: 404 });
    return NextResponse.json({ workspace });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load workspace' },
      { status: 500 },
    );
  }
}
