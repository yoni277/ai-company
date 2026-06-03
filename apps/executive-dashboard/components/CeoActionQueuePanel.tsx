import type { DecisionSupportResult } from '@ai-company/shared-types';
import { Badge, Card } from './Card';

const PRIORITY_COLOR = {
  P1: 'bg-red-500/15 text-red-300',
  P2: 'bg-amber-500/15 text-amber-300',
  P3: 'bg-slate-500/15 text-slate-300',
} as const;

const CATEGORY_COLOR = {
  marketing: 'bg-sky-500/15 text-sky-300',
  sales: 'bg-violet-500/15 text-violet-300',
  operations: 'bg-emerald-500/15 text-emerald-300',
  product: 'bg-fuchsia-500/15 text-fuchsia-300',
} as const;

export function CeoActionQueuePanel({ results }: { results: DecisionSupportResult[] }) {
  const actions = results.flatMap((r) => r.actions);
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Phase 3C · CEO action queue (recommendations only — approval required)</span>
      </div>

      <Card
        title="CEO Action Queue"
        subtitle="Deterministic recommendations from funnel intelligence. No autonomous execution."
      >
        <ul className="divide-y divide-slate-800">
          {actions.map((a) => (
            <li key={a.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className={PRIORITY_COLOR[a.priority]}>{a.priority}</Badge>
                <Badge className={CATEGORY_COLOR[a.category]}>{a.category}</Badge>
                <span className="text-xs text-slate-500">{a.projectName}</span>
                {a.requiresApproval ? (
                  <Badge className="bg-amber-500/10 text-amber-200 border border-amber-500/30">
                    Requires approval
                  </Badge>
                ) : null}
              </div>
              <div className="text-sm font-medium text-slate-100">{a.title}</div>
              <p className="text-sm text-slate-400 mt-1">{a.reason}</p>
              <p className="text-xs text-slate-500 mt-2">
                Expected impact: <span className="text-slate-300">{a.expectedImpact}</span>
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
