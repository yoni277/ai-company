import { NextResponse } from 'next/server';
import type { CEODecisionStatus, UpdateCEODecisionInput } from '@ai-company/shared-types';
import { updateDecision } from '../../../../../lib/ceo-operating-system';

export const dynamic = 'force-dynamic';

const ALLOWED: CEODecisionStatus[] = [
  'proposed',
  'approved',
  'rejected',
  'deferred',
  'in_progress',
  'completed',
  'cancelled',
];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateCEODecisionInput;
    if (
      body.decisionStatus !== undefined &&
      !ALLOWED.includes(body.decisionStatus)
    ) {
      return NextResponse.json({ error: 'Invalid decisionStatus' }, { status: 400 });
    }
    const decision = await updateDecision(id, body);
    return NextResponse.json({ decision });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update decision' },
      { status: 500 },
    );
  }
}
