import { NextResponse } from 'next/server';
import { loadFoodTruckBusinessMetrics } from '../../../../lib/owner-acquisition';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { metrics } = await loadFoodTruckBusinessMetrics();
  return NextResponse.json(metrics);
}
