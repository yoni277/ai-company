import { NextResponse } from 'next/server';
import type { CreateCEODirectiveInput } from '@ai-company/shared-types';
import { createDirective, listActiveDirectives } from '../../../../lib/ceo-operating-system';
import { enqueueResponses } from '../../../../lib/directive-queue';
import { getPlatform } from '../../../../lib/platform';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const directives = await listActiveDirectives();
    return NextResponse.json({ directives });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load directives' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCEODirectiveInput;
    if (!body.title?.trim() || !body.directive?.trim() || !body.category || !body.priority) {
      return NextResponse.json({ error: 'title, directive, category, and priority are required' }, { status: 400 });
    }
    // Phase 1B: if caller links an objective, verify it exists before insert.
    if (body.objectiveId) {
      const { repos } = getPlatform();
      const obj = await repos.objectives.getById(body.objectiveId);
      if (!obj) {
        return NextResponse.json(
          { error: `objective ${body.objectiveId} not found` },
          { status: 404 },
        );
      }
    }
    const directive = await createDirective({
      title: body.title.trim(),
      directive: body.directive.trim(),
      category: body.category,
      priority: body.priority,
      active: body.active ?? true,
      expiresAt: body.expiresAt ?? null,
      isOverride: body.isOverride ?? false,
      targetProjectId: body.targetProjectId ?? null,
      ...(body.respondingExecutives !== undefined
        ? { respondingExecutives: body.respondingExecutives }
        : {}),
      objectiveId: body.objectiveId ?? null,
    });

    // Enqueue one pending row per responding executive. The actual LLM work
    // is NOT started here — POST /api/ceo/directives/[id]/run-pending drains
    // the queue. `after()` was previously used to fire fan-out here but it
    // was being terminated by the Next dev runtime mid-LLM-call. The queue
    // is the durable replacement.
    if (directive.active && directive.respondingExecutives.length > 0) {
      await enqueueResponses(
        directive.id,
        directive.respondingExecutives,
      );
    }

    return NextResponse.json({ directive }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create directive' },
      { status: 500 },
    );
  }
}
