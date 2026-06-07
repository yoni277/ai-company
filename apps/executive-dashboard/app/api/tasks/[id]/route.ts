import { NextResponse } from 'next/server';
import type { UpdateTaskInput } from '@ai-company/shared-types';
import { updateTaskMeta } from '../../../../lib/doos';
import { getPlatform } from '../../../../lib/platform';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { repos } = getPlatform();
    const [task, evidence] = await Promise.all([
      repos.tasks.getById(id),
      repos.evidenceTokens.listByTask(id),
    ]);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json({ task, evidence });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load task' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateTaskInput;
    const task = await updateTaskMeta(id, body);
    return NextResponse.json({ task });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update task' },
      { status: 500 },
    );
  }
}
