import Link from 'next/link';
import { ensureSeededMockData, getPlatform } from '../../lib/platform';
import { Badge, Card, EmptyState } from '../../components/Card';
import { BriefingButton } from '../../components/BriefingButton';
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  PRIORITY_COLOR,
  SEVERITY_COLOR,
  relativeTime,
} from '../../lib/format';
import {
  CHIEF_OF_STAFF_ID,
  type ChiefOfStaffOutput,
} from '@ai-company/ai-chief-of-staff';

export const dynamic = 'force-dynamic';

export default async function ChiefOfStaffPage() {
  await ensureSeededMockData();
  const { repos } = getPlatform();
  const [latest, recent] = await Promise.all([
    repos.reports.latest(CHIEF_OF_STAFF_ID, 'daily_briefing'),
    repos.reports.list({ executiveId: CHIEF_OF_STAFF_ID, limit: 10 }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">AI Chief of Staff</h1>
          <p className="text-sm text-slate-500 mt-1">
            Advisory only · cannot take actions, approve spend, or modify external systems
          </p>
        </div>
        <div className="flex gap-2">
          <BriefingButton reportType="daily_briefing" label="New daily briefing" />
          <BriefingButton reportType="weekly_report" label="New weekly report" />
        </div>
      </header>

      {latest ? (
        <>
          <Card
            title="Current recommendations"
            subtitle={`From ${latest.reportType.replace('_', ' ')} · ${relativeTime(latest.createdAt)}`}
          >
            <p className="text-sm text-slate-100 mb-4">{latest.summary}</p>
            <ol className="space-y-3">
              {(latest.body as ChiefOfStaffOutput).ceoPriorities.map((p) => (
                <li key={p.rank} className="flex gap-3">
                  <span className="text-slate-500 text-sm w-6">#{p.rank}</span>
                  <div>
                    <div className="text-sm text-slate-100 font-medium">{p.title}</div>
                    <div className="text-xs text-slate-400">{p.rationale}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Top risks (current read)">
              <ul className="space-y-3">
                {(latest.body as ChiefOfStaffOutput).topRisks.map((r, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Badge className={SEVERITY_COLOR[r.severity]}>{r.severity}</Badge>
                    <div>
                      <div className="text-sm text-slate-100">{r.description}</div>
                      <div className="text-xs text-slate-500">{r.projectSlug}</div>
                      <div className="text-xs text-slate-400 mt-1">→ {r.recommendedAction}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Top opportunities (current read)">
              <ul className="space-y-3">
                {(latest.body as ChiefOfStaffOutput).topOpportunities.map((o, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Badge className={PRIORITY_COLOR[o.priority]}>{o.priority}</Badge>
                    <div>
                      <div className="text-sm text-slate-100">{o.description}</div>
                      <div className="text-xs text-slate-500">{o.projectSlug}</div>
                      <div className="text-xs text-slate-400 mt-1">→ {o.recommendedAction}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title="Company health">
            <Badge className={HEALTH_COLOR[(latest.body as ChiefOfStaffOutput).companyHealth]}>
              {HEALTH_LABEL[(latest.body as ChiefOfStaffOutput).companyHealth]}
            </Badge>
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState>
            No briefing yet. Use <strong>New daily briefing</strong> above to generate one.
          </EmptyState>
        </Card>
      )}

      <Card title="History">
        {recent.length === 0 ? (
          <EmptyState>None.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-800">
            {recent.map((r) => (
              <li key={r.id} className="py-3">
                <Link href={`/reports/${r.id}` as never} className="text-sm text-slate-100 hover:underline">
                  {r.summary}
                </Link>
                <div className="text-xs text-slate-500">
                  {r.reportType.replace('_', ' ')} · {relativeTime(r.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
