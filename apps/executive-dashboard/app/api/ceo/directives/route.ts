import { NextResponse } from 'next/server';
import type { CreateCEODirectiveInput } from '@ai-company/shared-types';
import { createDirective, listActiveDirectives } from '../../../../lib/ceo-operating-system';
import { enqueueResponses } from '../../../../lib/directive-queue';
import { listBusinessSlugs } from '../../../../lib/executive-os/meetings';
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
    // OF-011 / D085 item 4 — business scoping is mandatory: directive work cannot
    // enter the spine without a project_slug. Default to the active business (the
    // sole/first enabled project) when the caller did not scope the directive. NOT
    // a fabricated default — it is the genuine active business; when zero (or the
    // lookup fails) we leave it null and surface the directive as unscoped for the
    // CEO to assign, never inventing one.
    let targetProjectId = body.targetProjectId ?? null;
    if (!targetProjectId) {
      targetProjectId = await resolveActiveBusinessSlug();
    }

    const directive = await createDirective({
      title: body.title.trim(),
      directive: body.directive.trim(),
      category: body.category,
      priority: body.priority,
      active: body.active ?? true,
      expiresAt: body.expiresAt ?? null,
      isOverride: body.isOverride ?? false,
      targetProjectId,
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

/**
 * The active business a freshly-created directive is scoped to: the first
 * enabled project_definition (same "active business" convention the Situation
 * Room and /work use, businesses[0]). Returns null when no business is enabled
 * or the lookup is unavailable (dev/no-supabase) — the directive then stays
 * unscoped and the CEO assigns a business via the directive detail affordance.
 * Never fabricates a slug.
 */
async function resolveActiveBusinessSlug(): Promise<string | null> {
  try {
    const businesses = await listBusinessSlugs();
    return businesses[0]?.slug ?? null;
  } catch {
    return null;
  }
}
