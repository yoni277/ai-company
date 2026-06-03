import { NextResponse } from 'next/server';
import { loadFunnelSnapshots } from '../../../../lib/funnel-intelligence';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshots = await loadFunnelSnapshots();
  return NextResponse.json({ snapshots });
}
