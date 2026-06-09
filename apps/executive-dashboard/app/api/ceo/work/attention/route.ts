import { NextResponse } from 'next/server';
import { loadCeoAttentionQueue } from '../../../../../lib/executive-os/work-control';

export const dynamic = 'force-dynamic';

/**
 * EPIC-004 Phase 4 (WCC) — AC12 attention queue. The unified "what needs me"
 * feed (Needs CEO Completion · Awaiting Approval · Awaiting CEO Input · Blocked
 * · Overdue), ordered by priority then days-in-state. project_slug-scoped;
 * empty business → { attention: [] }.
 */
export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get('project_slug') ?? undefined;
    const attention = await loadCeoAttentionQueue(slug);
    return NextResponse.json({ attention, count: attention.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load attention queue' },
      { status: 500 },
    );
  }
}
