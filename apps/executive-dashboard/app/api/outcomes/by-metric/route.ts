import { NextResponse } from 'next/server';
import { getPlatform } from '../../../../lib/platform';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * P008 — Cross-task metric history.
 *
 * Read-only convenience for the UI / scripts that want to see all outcomes
 * recorded against a given metric across tasks (e.g. every
 * `verified_truck_owners` observation, in time order).
 *
 * Per Chief Architect: this is NOT a rollup. It is a flat list of
 * task-attached outcomes filtered by metric. Aggregation upward
 * (project / objective / company) is P009+ territory.
 *
 * Query:
 *   ?name=verified_truck_owners       (required)
 *   &limit=50                          (optional, default 50, max 200)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'query parameter `name` is required' },
        { status: 400 },
      );
    }
    const limitRaw = url.searchParams.get('limit');
    let limit = 50;
    if (limitRaw !== null) {
      const parsed = Number(limitRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: 'limit must be a positive integer' },
          { status: 400 },
        );
      }
      limit = Math.min(parsed, 200);
    }

    const { repos } = getPlatform();
    const outcomes = await repos.taskOutcomes.listByMetric(name, limit);
    return NextResponse.json({ metricName: name, outcomes });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list outcomes' },
      { status: 500 },
    );
  }
}
