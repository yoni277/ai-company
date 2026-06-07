import { NextResponse } from 'next/server';
import type { CreateObjectiveInput } from '@ai-company/shared-types';
import { createObjective, listObjectives, GovernanceLimitError } from '../../../lib/doos';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    const objectives = await listObjectives();
    return NextResponse.json({ objectives });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list objectives' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateObjectiveInput;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const objective = await createObjective({
      ...body,
      title: body.title.trim(),
    });
    return NextResponse.json({ objective }, { status: 201 });
  } catch (e) {
    if (e instanceof GovernanceLimitError) {
      return NextResponse.json(
        {
          error: 'governance: maxActiveObjectives reached',
          current: e.current,
          limit: e.limit,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create objective' },
      { status: 500 },
    );
  }
}
