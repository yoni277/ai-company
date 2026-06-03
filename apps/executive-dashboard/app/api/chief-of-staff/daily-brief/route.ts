import { NextResponse } from 'next/server';
import { getPlatform } from '../../../../lib/platform';
import { loadDailyCeoBrief } from '../../../../lib/phase2-metrics';

export const dynamic = 'force-dynamic';

export async function POST() {
  const { repos } = getPlatform();
  const brief = await loadDailyCeoBrief(repos);
  return NextResponse.json({ brief });
}
