import { NextResponse } from 'next/server';
import { getPlatform } from '../../../lib/platform';
import type { ReportType } from '@ai-company/shared-types';

export const dynamic = 'force-dynamic';

const ALLOWED: ReportType[] = ['daily_briefing', 'weekly_report', 'ad_hoc'];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const { repos } = getPlatform();
  const reports = await repos.reports.list({
    ...(type && ALLOWED.includes(type as ReportType) ? { reportType: type as ReportType } : {}),
    limit: 50,
  });
  return NextResponse.json(reports);
}
