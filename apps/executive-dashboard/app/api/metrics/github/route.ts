import { NextResponse } from 'next/server';
import { githubConnectorFromEnv } from '@ai-company/connector-github';

export const dynamic = 'force-dynamic';

export async function GET() {
  const connector = githubConnectorFromEnv();
  const metrics = await connector.fetchMetrics();
  return NextResponse.json({ metrics, live: connector.live });
}
