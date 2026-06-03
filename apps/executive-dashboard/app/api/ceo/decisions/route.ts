import { NextResponse } from 'next/server';
import type { CreateCEODecisionInput } from '@ai-company/shared-types';
import { createDecision, listDecisions } from '../../../../lib/ceo-operating-system';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const decisions = await listDecisions();
    return NextResponse.json({ decisions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load decisions' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCEODecisionInput;
    if (!body.decisionTitle?.trim()) {
      return NextResponse.json({ error: 'decisionTitle is required' }, { status: 400 });
    }
    const decision = await createDecision({
      sourceActionId: body.sourceActionId ?? null,
      projectId: body.projectId ?? null,
      decisionTitle: body.decisionTitle.trim(),
      decisionDescription: body.decisionDescription ?? null,
      decisionStatus: body.decisionStatus ?? 'proposed',
      owner: body.owner ?? null,
      dueDate: body.dueDate ?? null,
      priority: body.priority ?? 'P2',
      notes: body.notes ?? null,
    });
    return NextResponse.json({ decision }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create decision' },
      { status: 500 },
    );
  }
}
