import { NextResponse } from 'next/server';
import { getPlatform } from '../../../../lib/platform';
import { runCooBriefing } from '@ai-company/ai-coo';
import type { ReportType } from '@ai-company/shared-types';

export const dynamic = 'force-dynamic';

const ALLOWED: ReportType[] = ['daily_briefing', 'weekly_report', 'ad_hoc'];

export async function POST(req: Request) {
  let reportType: ReportType = 'daily_briefing';
  try {
    const body = (await req.json()) as { reportType?: ReportType };
    if (body.reportType && ALLOWED.includes(body.reportType)) reportType = body.reportType;
  } catch {
    // body is optional
  }

  const { repos, coo } = getPlatform();
  try {
    const result = await runCooBriefing(repos, coo, reportType);
    return NextResponse.json(result.report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: { code: 'COO_BRIEFING_FAILED', message } },
      { status: 500 },
    );
  }
}
