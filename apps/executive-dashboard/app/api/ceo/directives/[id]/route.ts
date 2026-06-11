import { NextResponse } from 'next/server';
import type { UpdateCEODirectiveInput } from '@ai-company/shared-types';
import {
  getDirectiveById,
  updateDirective,
} from '../../../../../lib/ceo-operating-system';
import { enqueueResponses } from '../../../../../lib/directive-queue';
import { emitDirectiveSpine } from '../../../../../lib/executive-os/directive-spine';
import { getPlatform } from '../../../../../lib/platform';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const directive = await getDirectiveById(id);
    if (!directive) {
      return NextResponse.json({ error: 'Directive not found' }, { status: 404 });
    }
    return NextResponse.json({ directive });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load directive' },
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
    const body = (await request.json()) as UpdateCEODirectiveInput;

    const hasAnyField =
      body.title !== undefined ||
      body.directive !== undefined ||
      body.category !== undefined ||
      body.priority !== undefined ||
      body.active !== undefined ||
      body.expiresAt !== undefined ||
      body.targetProjectId !== undefined ||
      body.respondingExecutives !== undefined ||
      body.objectiveId !== undefined;
    if (!hasAnyField) {
      const current = await getDirectiveById(id);
      if (!current) return NextResponse.json({ error: 'Directive not found' }, { status: 404 });
      return NextResponse.json({ directive: current });
    }

    // Phase 1B: when caller wants to link an objective, verify it exists so
    // the FK violation surfaces as a clean 404 instead of an opaque DB error.
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

    const directive = await updateDirective(id, body);

    // Re-enqueue (reset to pending) when substantive content changed or the
    // directive was just reactivated. Toggling only expiry or target project
    // does not produce a re-run. Existing rows for unchanged responders are
    // reset to pending via the unique (directive_id, executive_id) upsert.
    const contentChanged =
      body.title !== undefined ||
      body.directive !== undefined ||
      body.category !== undefined ||
      body.respondingExecutives !== undefined;
    const reactivated = body.active === true;
    if (
      (contentChanged || reactivated) &&
      directive.active &&
      directive.respondingExecutives.length > 0
    ) {
      await enqueueResponses(
        directive.id,
        directive.respondingExecutives,
      );
    }

    // OF-011 / D085 item 4 — the "assign business" affordance. When the CEO scopes
    // a previously-unscoped directive (target_project_id newly set), its proposals
    // already persisted on the first drain but never reached the spine (unscoped).
    // Converge them now without forcing a full responder re-run. Idempotent; a
    // spine hiccup must not fail the PATCH, so it is best-effort.
    if (body.targetProjectId !== undefined && directive.targetProjectId && !contentChanged && !reactivated) {
      try {
        await emitDirectiveSpine(directive.id);
      } catch {
        // best-effort: surfaced elsewhere; never block the business assignment.
      }
    }

    return NextResponse.json({ directive });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update directive' },
      { status: 500 },
    );
  }
}
