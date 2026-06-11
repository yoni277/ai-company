import { NextResponse } from 'next/server';
import {
  assembleCommunicationTimeline,
  type TimelineSourceType,
} from '../../../lib/executive-os/communication-timeline';

export const dynamic = 'force-dynamic';

/**
 * D086 Phase 1 — read-only lazy fetch for the communication lineage. The inline
 * expander and the Inspector both call this on demand (NOT on initial page
 * render — keeps payloads unchanged). No writes; observation only.
 *
 * GET /api/lineage?type=<directive|instruction|meeting|decision|work>&id=<id>
 */
const VALID_TYPES: readonly TimelineSourceType[] = [
  'directive',
  'instruction',
  'meeting',
  'decision',
  'work',
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    if (!type || !id) {
      return NextResponse.json({ error: 'type and id are required' }, { status: 400 });
    }
    if (!(VALID_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ error: `invalid type '${type}'` }, { status: 400 });
    }
    const result = await assembleCommunicationTimeline({
      sourceType: type as TimelineSourceType,
      sourceId: id,
    });
    if (!result) {
      return NextResponse.json({ error: 'source not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to assemble lineage' },
      { status: 500 },
    );
  }
}
