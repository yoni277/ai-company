import Link from 'next/link';
import { ensureSeededMockData, getPlatform } from '../../lib/platform';
import { Badge, Card } from '../../components/Card';
import { HEALTH_COLOR, HEALTH_LABEL } from '../../lib/format';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  await ensureSeededMockData();
  const { repos } = getPlatform();
  const projects = await repos.projects.list();

  const enriched = await Promise.all(
    projects.map(async (p) => {
      const [metrics, risks, opps, sources] = await Promise.all([
        repos.metrics.listLatestByProject(p.id, 1),
        repos.risks.listByProject(p.id, 'open'),
        repos.opportunities.listByProject(p.id),
        repos.dataSources.listByProject(p.id),
      ]);
      return { project: p, metrics, risks, opps, sources };
    }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Projects</h1>
        <p className="text-sm text-slate-500 mt-1">All monitored businesses</p>
      </header>
      <div className="grid md:grid-cols-2 gap-6">
        {enriched.map(({ project, metrics, risks, opps, sources }) => (
          <Card
            key={project.id}
            title={project.name}
            subtitle={project.description}
            action={<Badge className={HEALTH_COLOR[project.status]}>{HEALTH_LABEL[project.status]}</Badge>}
          >
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Mini label="Metrics" value={metrics.length} />
              <Mini label="Open risks" value={risks.length} />
              <Mini label="Opportunities" value={opps.length} />
            </div>
            <div className="text-xs text-slate-500">
              {sources.length === 0
                ? 'No data sources synced yet.'
                : `${sources.length} data source(s) · last sync ${sources[0]?.lastSync ?? 'never'}`}
            </div>
            <div className="mt-4">
              <Link
                href={`/projects/${project.slug}` as never}
                className="text-sm text-slate-200 hover:underline"
              >
                Open details →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-slate-800 rounded-md px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-base text-slate-100">{value}</div>
    </div>
  );
}
