import { NextResponse } from 'next/server';
import { listEvidenceOptions } from '../../../../../lib/executive-os/meetings';

export const dynamic = 'force-dynamic';

/** GET /api/ceo/meetings/evidence?project_slug= — pickable evidence for the wizard. */
export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get('project_slug');
    if (!slug) return NextResponse.json({ options: [] });
    const options = await listEvidenceOptions(slug);
    return NextResponse.json({ options });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load evidence' },
      { status: 500 },
    );
  }
}
