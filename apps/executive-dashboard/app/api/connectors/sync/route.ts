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

  // P006 — break down results so callers/UI can show skipped count alongside
  // ok/error. Skipped = the connector references an unregistered project slug.
  const counts = result.results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const skipped = result.results
    .filter((r) => r.status === 'skipped')
    .map((r) => ({
      connector: r.name,
      projectSlug: r.projectSlug,
      skipReason: r.skipReason,
    }));
  return NextResponse.json({ ...result, counts, skipped });
}
