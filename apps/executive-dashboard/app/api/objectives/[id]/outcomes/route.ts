import { NextResponse } from 'next/server';
import type { CreateOutcomeInput } from '@ai-company/shared-types';
import { createOutcome } from '../../../../../lib/doos';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Omit<CreateOutcomeInput, 'objectiveId'>;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const outcome = await createOutcome({
      ...body,
      name: body.name.trim(),
      objectiveId: id,
    });
    return NextResponse.json({ outcome }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create outcome' },
      { status: 500 },
    );
  }
}
