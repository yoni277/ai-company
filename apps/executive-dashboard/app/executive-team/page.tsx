import Link from 'next/link';
import { getPlatform } from '../../lib/platform';
import { Badge, Card, EmptyState } from '../../components/Card';
import { BoardDigestButton } from '../../components/BoardDigestButton';
import { HEALTH_COLOR, HEALTH_LABEL, SEVERITY_COLOR, relativeTime } from '../../lib/format';
import { EXECUTIVE_TEAM_ID } from '@ai-company/ai-executive-team';
import type { BoardDigestOutput, ProjectHealth } from '@ai-company/shared-types';

export const dynamic = 'force-dynamic';

function healthBadge(h: ProjectHealth | '') {
  if (h === '') {
    return <Badge className="bg-slate-700/30 text-slate-400 border-slate-600/30">no report</Badge>;
  }
  return <Badge className={HEALTH_COLOR[h]}>{HEALTH_LABEL[h]}</Badge>;
}

export default async function ExecutiveTeamPage() {
  const { repos } = getPlatform();
  const [latest, recent] = await Promise.all([
    repos.reports.latest(EXECUTIVE_TEAM_ID, 'daily_briefing'),
    repos.reports.list({ executiveId: EXECUTIVE_TEAM_ID, limit: 10 }),
  ]);

  const body = latest ? (latest.body as BoardDigestOutput) : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">AI Executive Team</h1>
          <p className="text-sm text-slate-500 mt-1">
            Board-level digest · synthesizes the latest reports from all other executives
          </p>
        </div>
        <div className="flex gap-2">
          <BoardDigestButton reportType="daily_briefing" label="New board digest" />
          <BoardDigestButton reportType="weekly_report" label="New weekly board review" />
        </div>
      </header>

      {body ? (
        <>
          <Card
            title="Headline"
            subtitle={`From ${latest!.reportType.replace('_', ' ')} · ${relativeTime(latest!.createdAt)}`}
            action={<Badge className={HEALTH_COLOR[body.companyVerdict]}>{HEALTH_LABEL[body.companyVerdict]}</Badge>}
          >
            <p className="text-sm text-slate-100">{body.headline}</p>
          </Card>

          <Card title="Executive snapshot">
            <div className="grid md:grid-cols-2 gap-3">
              {body.executiveSnapshot.map((e) => (
                <div key={e.executiveId} className="border border-slate-800 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-100">{e.displayName}</div>
                    {healthBadge(e.health)}
                  </div>
                  {e.headline ? (
                    <div className="text-xs text-slate-400 mt-2">{e.headline}</div>
                  ) : (
                    <div className="text-xs text-slate-500 mt-2 italic">No briefing yet.</div>
                  )}
                  {e.topPriority && (
                    <div className="text-xs text-emerald-300/80 mt-1">→ {e.topPriority}</div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Strategic moves (synthesized)">
            {body.strategicMoves.length === 0 ? (
              <EmptyState>None yet.</EmptyState>
            ) : (
              <ol className="space-y-3">
                {body.strategicMoves.map((m) => (
                  <li key={m.rank} className="flex gap-3">
                    <span className="text-slate-500 text-sm w-6">#{m.rank}</span>
                    <div>
                      <div className="text-sm text-slate-100 font-medium">{m.title}</div>
                      <div className="text-xs text-slate-400">{m.rationale}</div>
                      {m.contributingExecutives.length > 0 && (
                        <div className="text-xs text-slate-500 mt-1">
                          Contributing: {m.contributingExecutives.join(', ')}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Convergent themes" subtitle="Where 2+ executives align">
              {body.convergentThemes.length === 0 ? (
                <EmptyState>No convergence yet. Each executive is flagging different things.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {body.convergentThemes.map((t, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Badge className={SEVERITY_COLOR[t.severity]}>{t.severity}</Badge>
                      <div>
                        <div className="text-sm text-slate-100">{t.theme}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Projects: {t.affectedProjects.join(', ') || '—'}
                        </div>
                        <div className="text-xs text-slate-500">
                          Surfaced by: {t.surfacedBy.join(', ')}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Tensions" subtitle="Where executives disagree">
              {body.tensions.length === 0 ? (
                <EmptyState>No explicit tensions detected.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {body.tensions.map((t, i) => (
                    <li key={i}>
                      <div className="text-sm text-slate-100 font-medium">{t.title}</div>
                      <div className="text-xs text-slate-400 mt-1">{t.description}</div>
                      <ul className="text-xs text-slate-500 mt-2 space-y-0.5">
                        {t.parties.map((p, j) => (
                          <li key={j}>
                            <span className="text-slate-300">{p.executiveId}</span>: {p.position}
                          </li>
                        ))}
                      </ul>
                      <div className="text-xs text-emerald-300/80 mt-2">→ {t.recommendedResolution}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="CEO open questions">
            {body.ceoOpenQuestions.length === 0 ? (
              <EmptyState>The synthesis surfaces no open decisions for you right now.</EmptyState>
            ) : (
              <ol className="space-y-2 list-decimal list-inside">
                {body.ceoOpenQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-slate-100">
                    {q}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState>
            No board digest yet. Generate each executive briefing first, then click{' '}
            <strong>New board digest</strong> above to synthesize them.
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
