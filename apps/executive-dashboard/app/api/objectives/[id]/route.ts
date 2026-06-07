import { NextResponse } from 'next/server';
import type { UpdateObjectiveInput } from '@ai-company/shared-types';
import { getObjectiveDetail, updateObjective, GovernanceLimitError } from '../../../../lib/doos';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const detail = await getObjectiveDetail(id);
    if (!detail) return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load objective' },
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
    const body = (await request.json()) as UpdateObjectiveInput;
    const objective = await updateObjective(id, body);
    return NextResponse.json({ objective });
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
      { error: e instanceof Error ? e.message : 'Failed to update objective' },
      { status: 500 },
    );
  }
}
