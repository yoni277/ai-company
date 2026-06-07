import { NextResponse } from 'next/server';
import type { CreateTaskInput, TaskStatus } from '@ai-company/shared-types';
import { createTask } from '../../../lib/doos';
import { getPlatform } from '../../../lib/platform';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filter: {
      objectiveId?: string;
      directiveId?: string;
      ownerId?: string;
      status?: TaskStatus;
    } = {};
    const obj = url.searchParams.get('objectiveId');
    const dir = url.searchParams.get('directiveId');
    const own = url.searchParams.get('ownerId');
    const st = url.searchParams.get('status');
    if (obj) filter.objectiveId = obj;
    if (dir) filter.directiveId = dir;
    if (own) filter.ownerId = own;
    if (st) filter.status = st as TaskStatus;
    const { repos } = getPlatform();
    const tasks = await repos.tasks.list(filter);
    return NextResponse.json({ tasks });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list tasks' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateTaskInput;
    if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!body.objectiveId) return NextResponse.json({ error: 'objectiveId is required' }, { status: 400 });
    if (!body.capabilityRequired?.trim()) return NextResponse.json({ error: 'capabilityRequired is required' }, { status: 400 });
    const task = await createTask({
      ...body,
      title: body.title.trim(),
      capabilityRequired: body.capabilityRequired.trim(),
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create task' },
      { status: 500 },
    );
  }
}
