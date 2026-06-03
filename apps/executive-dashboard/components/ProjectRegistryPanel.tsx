import type { FunnelHealth, RegisteredProject } from '@ai-company/shared-types';
import { Badge, Card } from './Card';

export interface ProjectRegistryViewRow {
  project: RegisteredProject;
  funnelHealth: FunnelHealth['status'] | null;
  bottleneck: string | null;
  openRecommendations: number;
}

const STATUS_COLOR = {
  active: 'bg-emerald-500/15 text-emerald-300',
  inactive: 'bg-slate-500/15 text-slate-400',
  archived: 'bg-slate-700 text-slate-500',
} as const;

const FUNNEL_HEALTH_COLOR = {
  healthy: 'bg-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-300',
  critical: 'bg-red-500/15 text-red-300',
} as const;

export function ProjectRegistryPanel({
  rows,
  source,
  valid,
}: {
  rows: ProjectRegistryViewRow[];
  source: 'database' | 'in-memory';
  valid: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Phase 4B · Project registry (data-driven)</span>
        <Badge className={source === 'database' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}>
          {source === 'database' ? 'database' : 'in-memory seed'}
        </Badge>
        <Badge className={valid ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}>
          {valid ? 'valid' : 'invalid'}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {rows.map((row) => (
          <RegistryProjectCard key={row.project.definition.slug} row={row} />
        ))}
      </div>
    </div>
  );
}

function RegistryProjectCard({ row }: { row: ProjectRegistryViewRow }) {
  const { definition, funnel, connector } = row.project;

  return (
    <Card title={definition.name} subtitle={definition.slug}>
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge className={STATUS_COLOR[definition.status]}>{definition.status}</Badge>
        <Badge className="bg-slate-700 text-slate-300">{connector.connectorType}</Badge>
        {connector.liveCapable ? (
          <Badge className="bg-sky-500/15 text-sky-300">live capable</Badge>
        ) : (
          <Badge className="bg-slate-700 text-slate-400">mock</Badge>
        )}
        {row.funnelHealth ? (
          <Badge className={FUNNEL_HEALTH_COLOR[row.funnelHealth]}>{row.funnelHealth}</Badge>
        ) : null}
      </div>

      <p className="text-sm text-slate-400 mb-4">{definition.description}</p>

      <div className="text-xs text-slate-500 mb-2">Funnel stages</div>
      <ul className="text-sm text-slate-300 space-y-1 mb-4">
        {[...funnel.stages]
          .sort((a, b) => a.order - b.order)
          .map((s) => (
            <li key={s.id}>
              {s.label}{' '}
              <span className="text-slate-500">
                ({funnel.mockStageCounts[s.id] ?? 0} mock)
              </span>
            </li>
          ))}
      </ul>

      <div className="text-sm text-slate-400">
        Bottleneck:{' '}
        <span className="text-slate-200">{row.bottleneck ?? '—'}</span>
      </div>
      <div className="text-sm text-slate-400 mt-1">
        Open recommendations:{' '}
        <span className="text-slate-200">{row.openRecommendations}</span>
      </div>
    </Card>
  );
}
