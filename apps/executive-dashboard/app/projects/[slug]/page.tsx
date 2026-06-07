import { notFound } from 'next/navigation';
import { getPlatform } from '../../../lib/platform';
import { Badge, Card, EmptyState } from '../../../components/Card';
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  PRIORITY_COLOR,
  SEVERITY_COLOR,
  formatMetric,
  relativeTime,
} from '../../../lib/format';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { repos } = getPlatform();
  const project = await repos.projects.getBySlug(slug);
  if (!project) notFound();

  const [metrics, risks, opps, sources] = await Promise.all([
    repos.metrics.listLatestByProject(project.id, 1),
    repos.risks.listByProject(project.id),
    repos.opportunities.listByProject(project.id),
    repos.dataSources.listByProject(project.id),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{project.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{project.description}</p>
        </div>
        <Badge className={HEALTH_COLOR[project.status]}>{HEALTH_LABEL[project.status]}</Badge>
      </header>

      <Card title="Key metrics">
        {metrics.length === 0 ? (
          <EmptyState>No metrics yet — try a sync.</EmptyState>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <div key={m.id} className="border border-slate-800 rounded-md px-3 py-2">
                <div className="text-xs text-slate-500">{m.name}</div>
                <div className="text-lg text-slate-100">{formatMetric(m.value, m.unit)}</div>
                <div className="text-xs text-slate-600">{relativeTime(m.timestamp)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Risks">
        {risks.length === 0 ? (
          <EmptyState>No risks recorded.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {risks.map((r) => (
              <li key={r.id} className="flex items-start gap-3">
                <Badge className={SEVERITY_COLOR[r.severity]}>{r.severity}</Badge>
                <div>
                  <div className="text-sm text-slate-100">{r.description}</div>
                  <div className="text-xs text-slate-500">
                    {r.source} · {r.status} · {relativeTime(r.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Opportunities">
        {opps.length === 0 ? (
          <EmptyState>No opportunities recorded.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {opps.map((o) => (
              <li key={o.id} className="flex items-start gap-3">
                <Badge className={PRIORITY_COLOR[o.priority]}>{o.priority}</Badge>
                <div>
                  <div className="text-sm text-slate-100">{o.description}</div>
                  <div className="text-xs text-slate-500">
                    {o.source} · {relativeTime(o.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Data sources">
        {sources.length === 0 ? (
          <EmptyState>No data sources synced.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-100">{s.sourceType}</span>
                <span className="text-xs text-slate-500">
                  {s.status} · last sync {s.lastSync ? relativeTime(s.lastSync) : 'never'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
