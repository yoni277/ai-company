import { NextResponse } from 'next/server';
import { supabasePlatformConnectorFromEnv } from '@ai-company/connector-supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const connector = supabasePlatformConnectorFromEnv();
  const metrics = await connector.fetchMetrics();
  return NextResponse.json({ metrics, live: connector.live });
}
