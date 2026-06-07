import { NextResponse } from 'next/server';
import type { UpdateOutcomeMeasurementInput } from '@ai-company/shared-types';
import { updateOutcomeMeasurement } from '../../../../../lib/doos';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateOutcomeMeasurementInput;
    if (typeof body.currentValue !== 'number') {
      return NextResponse.json(
        { error: 'currentValue (number) is required' },
        { status: 400 },
      );
    }
    const outcome = await updateOutcomeMeasurement(id, body);
    return NextResponse.json({ outcome, achieved: outcome.status === 'achieved' });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update measurement' },
      { status: 500 },
    );
  }
}
