import { NextResponse } from 'next/server';
import { createMeeting, listMeetings } from '../../../../lib/executive-os/meetings';

export const dynamic = 'force-dynamic';

/** GET /api/ceo/meetings?project_slug=&status=  — scoped list. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filter: { projectSlug?: string; status?: string } = {};
    const slug = url.searchParams.get('project_slug');
    const status = url.searchParams.get('status');
    if (slug) filter.projectSlug = slug;
    if (status) filter.status = status;
    const meetings = await listMeetings(filter);
    return NextResponse.json({ meetings });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list meetings' },
      { status: 500 },
    );
  }
}

/** POST /api/ceo/meetings — create (scheduled). project_slug + type + topic required. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      project_slug?: string;
      type?: string;
      topic?: string;
      participants?: string[];
      objective_id?: string | null;
      directive_id?: string | null;
      evidence_pack?: { kind: string; text: string; ref?: string }[];
    };
    if (!body.project_slug?.trim() || !body.type?.trim() || !body.topic?.trim()) {
      return NextResponse.json(
        { error: 'project_slug, type, and topic are required' },
        { status: 400 },
      );
    }
    const created = await createMeeting({
      projectSlug: body.project_slug.trim(),
      type: body.type.trim(),
      topic: body.topic.trim(),
      participants: body.participants,
      objectiveId: body.objective_id ?? null,
      directiveId: body.directive_id ?? null,
      evidencePack: body.evidence_pack,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create meeting' },
      { status: 500 },
    );
  }
}
