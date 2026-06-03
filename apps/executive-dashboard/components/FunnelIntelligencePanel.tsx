import type { FunnelSnapshot } from '@ai-company/shared-types';
import { Badge, Card, Stat } from './Card';

const HEALTH_COLOR = {
  healthy: 'bg-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-300',
  critical: 'bg-red-500/15 text-red-300',
} as const;

export function FunnelIntelligencePanel({ snapshots }: { snapshots: FunnelSnapshot[] }) {
  if (snapshots.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Phase 3B · Funnel intelligence (generic engine)</span>
      </div>

      {snapshots.map((snapshot) => (
        <FunnelCard key={snapshot.projectId} snapshot={snapshot} />
      ))}
    </div>
  );
}

function FunnelCard({ snapshot }: { snapshot: FunnelSnapshot }) {
  const { health, conversions, metrics } = snapshot;
  const bn = health.mainBottleneck;

  return (
    <Card
      title={snapshot.projectName}
      subtitle="Stage counts, conversions, and bottleneck — deterministic"
      action={
        <Badge className={HEALTH_COLOR[health.status]}>{health.status}</Badge>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {metrics.map((m) => {
          const stage = snapshot.stages.find((s) => s.id === m.stageId);
          return (
            <Stat key={m.stageId} label={stage?.label ?? m.stageId} value={m.count} />
          );
        })}
      </div>

      {conversions.length > 0 ? (
        <div className="mb-4">
          <div className="text-xs text-slate-500 mb-2">Stage conversions</div>
          <ul className="space-y-2">
            {conversions.map((c) => (
              <li key={`${c.fromStageId}-${c.toStageId}`} className="text-sm text-slate-300">
                {c.fromLabel} → {c.toLabel}:{' '}
                <span className="text-slate-100">{c.rate}%</span>
                <span className="text-xs text-slate-500 ml-2">
                  ({c.toCount} / {c.fromCount})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {bn ? (
        <p className="text-sm text-slate-200">
          Main bottleneck:{' '}
          <span className="text-amber-200">
            {bn.fromLabel} → {bn.toLabel}
          </span>{' '}
          ({bn.rate}% conversion)
        </p>
      ) : (
        <p className="text-sm text-slate-500">No bottleneck detected (insufficient volume).</p>
      )}
    </Card>
  );
}
