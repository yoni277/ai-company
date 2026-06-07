import Link from 'next/link';
import { getPlatform } from '../../lib/platform';
import { Card, EmptyState } from '../../components/Card';
import { BriefingButton } from '../../components/BriefingButton';
import { relativeTime } from '../../lib/format';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const { repos } = getPlatform();
  const reports = await repos.reports.list({ limit: 50 });

  const daily = reports.filter((r) => r.reportType === 'daily_briefing');
  const weekly = reports.filter((r) => r.reportType === 'weekly_report');

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Briefings and weekly reports</p>
        </div>
        <div className="flex gap-2">
          <BriefingButton reportType="daily_briefing" label="New daily briefing" />
          <BriefingButton reportType="weekly_report" label="New weekly report" />
        </div>
      </header>

      <Card title="Daily briefings">
        {daily.length === 0 ? (
          <EmptyState>None yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-800">
            {daily.map((r) => (
              <li key={r.id} className="py-3">
                <Link href={`/reports/${r.id}` as never} className="text-sm text-slate-100 hover:underline">
                  {r.summary}
                </Link>
                <div className="text-xs text-slate-500">{relativeTime(r.createdAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Weekly reports">
        {weekly.length === 0 ? (
          <EmptyState>None yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-800">
            {weekly.map((r) => (
              <li key={r.id} className="py-3">
                <Link href={`/reports/${r.id}` as never} className="text-sm text-slate-100 hover:underline">
                  {r.summary}
                </Link>
                <div className="text-xs text-slate-500">{relativeTime(r.createdAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
