import { NextResponse } from 'next/server';
import { loadExecutiveDirectory } from '../../../../lib/executive-os/executives';

export const dynamic = 'force-dynamic';

/** GET /api/ceo/executives?project_slug= — directory (6 execs + rollups). */
export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get('project_slug');
    if (!slug) return NextResponse.json({ error: 'project_slug is required' }, { status: 400 });
    const executives = await loadExecutiveDirectory(slug);
    return NextResponse.json({ executives });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load executives' },
      { status: 500 },
    );
  }
}
