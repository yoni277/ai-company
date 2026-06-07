import type {
  CommandCenterHighlights,
  CommandCenterMaturity,
  CommandCenterPayload,
  ExecutiveScorecardRow,
  ExecutiveScoreStatus,
} from '../../lib/command-center';
import { Badge, Card, Stat } from '../Card';

const STATUS_STYLE: Record<ExecutiveScoreStatus, string> = {
  PASS: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'PASS WITH RISKS': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  FAIL: 'bg-red-500/15 text-red-300 border-red-500/30',
};

function money(amount: number, currency: string): string {
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency;
  return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
}

function HighlightCard({
  label,
  value,
  hint,
  accent = 'border-slate-800',
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div
      className={`rounded-xl border ${accent} bg-slate-900/50 p-4 min-h-[7.5rem] flex flex-col justify-between`}
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-50 leading-snug mt-2">{value}</div>
      {hint ? <div className="text-xs text-slate-500 mt-2 leading-relaxed">{hint}</div> : null}
    </div>
  );
}

export function HighlightsGrid({ h }: { h: CommandCenterHighlights }) {
  return (
    <section aria-label="Top highlights">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <HighlightCard
          label="Top priority project"
          value={h.topPriorityProject}
          hint={h.topPriorityReason}
          accent="border-amber-500/40"
        />
        <HighlightCard
          label="Top bottleneck"
          value={h.topBottleneck}
          hint="From funnel intelligence"
          accent="border-amber-500/30"
        />
        <HighlightCard
          label="Top risk"
          value={h.topRisk}
          hint="Highest-priority action"
          accent="border-red-500/30"
        />
        <HighlightCard
          label="Top action"
          value={h.topActionTitle}
          hint={h.topActionProject}
          accent="border-sky-500/30"
        />
      </div>
    </section>
  );
}

export function MaturityBar({ m }: { m: CommandCenterMaturity }) {
  return (
    <Card title="Data maturity" subtitle="Portfolio rollup · live vs mock">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat
          label="Portfolio revenue"
          value={money(m.portfolioRevenue, m.portfolioCurrency)}
          hint="Includes mock-backed projects"
        />
        <Stat
          label="Live projects"
          value={`${m.liveProjectCount} / ${m.totalProjects}`}
          hint="Real connector data"
        />
        <Stat
          label="Mock projects"
          value={`${m.mockProjectCount} / ${m.totalProjects}`}
          hint="Scenario / placeholder data"
        />
      </div>
    </Card>
  );
}

export function ScorecardTable({ rows }: { rows: ExecutiveScorecardRow[] }) {
  return (
    <Card title="Executive scorecard" subtitle="C-suite operational status · deterministic">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
              <th className="pb-2 pe-4">Executive</th>
              <th className="pb-2 pe-4">Status</th>
              <th className="pb-2">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row) => (
              <tr key={row.role} className="text-slate-200">
                <td className="py-3 pe-4 font-medium text-slate-100">{row.role}</td>
                <td className="py-3 pe-4">
                  <Badge className={STATUS_STYLE[row.status]}>{row.status}</Badge>
                </td>
                <td className="py-3 text-slate-400">{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function CommandCenterView({ data }: { data: CommandCenterPayload }) {
  const portfolioStatus = data.portfolio.health.status;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>Executive Command Center · single pane of glass</span>
        <Badge
          className={
            portfolioStatus === 'healthy'
              ? 'bg-emerald-500/15 text-emerald-300'
              : portfolioStatus === 'warning'
                ? 'bg-amber-500/15 text-amber-300'
                : 'bg-red-500/15 text-red-300'
          }
        >
          Portfolio {portfolioStatus}
        </Badge>
        <span className="text-slate-600">
          Updated {new Date(data.generatedAt).toLocaleString()}
        </span>
      </div>

      <HighlightsGrid h={data.highlights} />
      <MaturityBar m={data.maturity} />
      <ScorecardTable rows={data.scorecard} />
    </div>
  );
}
