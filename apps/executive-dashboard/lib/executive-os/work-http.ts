import 'server-only';
import { NextResponse } from 'next/server';
import { mapWorkError } from './work-control-core';

/**
 * EPIC-004 (WCC) — wrap the pure error mapping (mapWorkError, unit-tested) into a
 * NextResponse. The activation gate is the headline contract: dateless/ownerless
 * approve → 422 NEEDS_CEO_COMPLETION, so the UI can surface "Needs CEO
 * completion" inline instead of a generic failure.
 */
export function workErrorResponse(e: unknown): NextResponse {
  const { status, body } = mapWorkError(e);
  return NextResponse.json(body, { status });
}
