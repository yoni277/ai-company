import { NextResponse } from 'next/server';
import { completeTask, TaskCompletionError } from '../../../../../lib/doos';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { completedBy?: string };
    const completedBy = (body.completedBy ?? '').trim();
    if (!completedBy) {
      return NextResponse.json({ error: 'completedBy is required' }, { status: 400 });
    }
    const { task, validation } = await completeTask(id, completedBy);
    return NextResponse.json({ task, validation });
  } catch (e) {
    if (e instanceof TaskCompletionError) {
      return NextResponse.json(
        {
          error: 'task evidence insufficient',
          reasons: e.result.reasons,
          validatorVersion: e.result.validatorVersion,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to complete task' },
      { status: 500 },
    );
  }
}
