import type { PortfolioRevenueSnapshot } from '@ai-company/shared-types';
import { Badge, Card, Stat } from './Card';

function money(amount: number, currency: string): string {
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency;
  return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
}

export function RevenueOverviewPanel({
  revenue,
}: {
  revenue: PortfolioRevenueSnapshot | null;
}) {
  if (!revenue) return null;

  const { totals, projects } = revenue;
  const symbol = totals.currency;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Phase 5A · Revenue intelligence (observation only)</span>
      </div>

      <Card title="Revenue Overview" subtitle="Portfolio totals — deterministic, no forecasting">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Total revenue" value={money(totals.totalRevenue, symbol)} />
          <Stat label="Recurring revenue" value={money(totals.recurringRevenue, symbol)} />
          <Stat label="Transactions" value={totals.transactionCount} />
          <Stat
            label="Avg transaction"
            value={money(totals.averageTransactionValue, symbol)}
          />
        </div>

        {revenue.trend ? (
          <p className="text-xs text-slate-500 mb-4">
            Trend: {revenue.trend.direction} · revenue {revenue.trend.totalRevenueChangePercent}%
            · transactions {revenue.trend.transactionCountChangePercent}%
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="pb-2 pr-4">Project</th>
                <th className="pb-2 pr-4">Total</th>
                <th className="pb-2 pr-4">Recurring</th>
                <th className="pb-2 pr-4">Transactions</th>
                <th className="pb-2 pr-4">Avg value</th>
                <th className="pb-2">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {projects.map((p) => (
                <tr key={p.projectId} className="text-slate-200">
                  <td className="py-3 pr-4">{p.projectName}</td>
                  <td className="py-3 pr-4">{money(p.totalRevenue, p.currency)}</td>
                  <td className="py-3 pr-4">{money(p.recurringRevenue, p.currency)}</td>
                  <td className="py-3 pr-4">{p.transactionCount}</td>
                  <td className="py-3 pr-4">{money(p.averageTransactionValue, p.currency)}</td>
                  <td className="py-3">
                    <Badge
                      className={
                        p.live
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-700 text-slate-400'
                      }
                    >
                      {p.live ? 'live' : 'mock'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
