import { NextResponse } from 'next/server';
import { drainDirective } from '../../../../../../lib/directive-queue';

// Long-running: we hold the response open until each responder finishes its
// LLM round-trip. With 2 responders, expect ~30–90s typical, ~120s tail.
// dynamic = force-dynamic so this never gets cached or pre-rendered.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Drain all pending directive_responses rows for the given directive.
 *
 * This is the durable replacement for the previous after()-based fan-out.
 * Validation showed after() was terminated by the Next dev runtime after
 * ~one LLM round-trip; running the work in-thread (synchronously to the
 * request) survives whatever runtime budget after() was getting.
 *
 * Dispatch goes through @ai-company/ai-chief-of-staff's DirectiveResponder
 * registry. Adding a new executive does NOT require editing this file.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await drainDirective(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to drain directive queue' },
      { status: 500 },
    );
  }
}
