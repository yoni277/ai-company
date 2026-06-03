import { NextResponse } from 'next/server';
import { loadDecisionSupportResults } from '../../../../lib/decision-support';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = await loadDecisionSupportResults();
  return NextResponse.json({ results });
}
