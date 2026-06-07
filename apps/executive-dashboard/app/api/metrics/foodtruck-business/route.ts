import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// P015A (2026-06-06): this instance-specific metrics endpoint was removed from
// the generic platform route surface and now returns 404. The directory is
// retained only because the agent sandbox filesystem blocks deletion/rename;
// run `git rm -r` on this directory in a normal checkout to finish removal.
export function GET() {
  return NextResponse.json({ error: 'endpoint removed (P015A)' }, { status: 404 });
}
