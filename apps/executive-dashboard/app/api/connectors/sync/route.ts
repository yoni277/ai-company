import { NextResponse } from 'next/server';
import { getPlatform } from '../../../../lib/platform';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let connectors: string[] | undefined;
  try {
    const body = (await req.json()) as { connectors?: string[] };
    connectors = body.connectors;
  } catch {
    // body optional
  }

  const { orchestrator } = getPlatform();
  const options = connectors ? { connectorNames: connectors } : {};
  const result = await orchestrator.runAll(options);
  return NextResponse.json(result);
}
