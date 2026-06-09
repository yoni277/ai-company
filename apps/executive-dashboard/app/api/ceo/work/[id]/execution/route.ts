import { NextResponse } from 'next/server';
import { setExecutionStatus } from '../../../../../../lib/executive-os/work-control';
import { workErrorResponse } from '../../../../../../lib/executive-os/work-http';
import type { ExecutionStatus } from '../../../../../../lib/executive-os/work-control-core';

export const dynamic = 'force-dynamic';

const VALID: readonly ExecutionStatus[] = ['open', 'in_progress', 'blocked', 'done', 'cancelled'];

/**
 * EPIC-004 (WCC) — transition execution_status (start / block / done / cancel).
 * Always stamps status_changed_at (AC13). Optional `expectFrom` makes the write
 * a no-op when the row already moved (idempotent re-clicks / races).
 *
 * Body: { to: 'open'|'in_progress'|'blocked'|'done'|'cancelled', expectFrom? }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { to?: unknown; expectFrom?: unknown };
    if (typeof body.to !== 'string' || !(VALID as readonly string[]).includes(body.to)) {
      return NextResponse.json(
        { error: `'to' must be one of: ${VALID.join(', ')}` },
        { status: 400 },
      );
    }
    await setExecutionStatus(
      id,
      body.to as ExecutionStatus,
      typeof body.expectFrom === 'string' ? { expectFrom: body.expectFrom } : undefined,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return workErrorResponse(e);
  }
}
