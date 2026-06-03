import { NextResponse } from 'next/server';
import { ensureSeededMockData, getPlatform } from '../../../../lib/platform';
import { runCfoBriefing } from '@ai-company/ai-cfo';
import type { ReportType } from '@ai-company/shared-types';

export const dynamic = 'force-dynamic';

const ALLOWED: ReportType[] = ['daily_briefing', 'weekly_report', 'ad_hoc'];

export async function POST(req: Request) {
  await ensureSeededMockData();
  let reportType: ReportType = 'daily_briefing';
  try {
    const body = (await req.json()) as { reportType?: ReportType };
    if (body.reportType && ALLOWED.includes(body.reportType)) reportType = body.reportType;
  } catch {
    // body is optional
  }

  const { repos, cfo } = getPlatform();
  try {
    const result = await runCfoBriefing(repos, cfo, reportType);
    return NextResponse.json(result.report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: { code: 'CFO_BRIEFING_FAILED', message } },
      { status: 500 },
    );
  }
}
