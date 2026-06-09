import { NextResponse } from 'next/server';
import { createInstruction } from '../../../../lib/executive-os/instructions';
import { getSupabaseAdmin } from '../../../../lib/doos/supabase-admin';

export const dynamic = 'force-dynamic';

/** GET /api/ceo/instructions?project_slug=&to_executive_id= — scoped list. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('project_slug');
    const exec = url.searchParams.get('to_executive_id');
    const supa = getSupabaseAdmin();
    let q = supa
      .from('direct_instructions')
      .select('id, project_slug, to_executive_id, instruction, status, priority, created_at, responded_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (slug) q = q.eq('project_slug', slug);
    if (exec) q = q.eq('to_executive_id', exec);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return NextResponse.json({ instructions: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list instructions' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ceo/instructions — authorize-on-send: creates the instruction +
 * ceo_decisions audit + approved assigned_work in one act (safeguards D077).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      project_slug?: string;
      to_executive_id?: string;
      instruction?: string;
      expected_output?: string | null;
      priority?: string;
    };
    if (!body.project_slug?.trim() || !body.to_executive_id?.trim() || !body.instruction?.trim()) {
      return NextResponse.json(
        { error: 'project_slug, to_executive_id, and instruction are required' },
        { status: 400 },
      );
    }
    const result = await createInstruction({
      projectSlug: body.project_slug.trim(),
      toExecutiveId: body.to_executive_id.trim(),
      instruction: body.instruction.trim(),
      expectedOutput: body.expected_output ?? null,
      priority: body.priority,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create instruction' },
      { status: 500 },
    );
  }
}
