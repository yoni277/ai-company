import { NextResponse } from 'next/server';
import { getPlatform } from '../../../../lib/platform';
import { loadPhase2Snapshot } from '../../../../lib/phase2-metrics';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { repos } = getPlatform();
  const snapshot = await loadPhase2Snapshot(repos);
  return NextResponse.json({ health: snapshot.health });
}
