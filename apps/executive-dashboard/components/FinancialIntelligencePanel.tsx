import type { PortfolioFinancialSnapshot } from '@ai-company/shared-types';
import { Badge, Card, Stat } from './Card';

function money(amount: number, currency: string): string {
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency;
  return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
}

function trendCell(value: number | null): string {
  if (value === null) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

export function FinancialIntelligencePanel({
  financial,
}: {
  financial: PortfolioFinancialSnapshot | null;
}) {
  if (!financial) return null;

  const { currency } = financial;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Phase 5B · Financial intelligence (observation only)</span>
      </div>

      <Card
        title="Financial Intelligence"
        subtitle="Portfolio totals — deterministic, no forecasting or recommendations"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Total revenue" value={money(financial.totalRevenue, currency)} />
          <Stat label="Recurring revenue" value={money(financial.recurringRevenue, currency)} />
          <Stat label="Transactions" value={financial.transactionCount} />
          <Stat
            label="Avg transaction"
            value={money(financial.averageTransactionValue, currency)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="pb-2 pr-4">Project</th>
                <th className="pb-2 pr-4">Revenue</th>
                <th className="pb-2 pr-4">Recurring</th>
                <th className="pb-2 pr-4">Transactions</th>
                <th className="pb-2 pr-4">Avg transaction</th>
                <th className="pb-2 pr-4">Revenue growth</th>
                <th className="pb-2 pr-4">Txn growth</th>
                <th className="pb-2">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {financial.projects.map((p) => (
                <tr key={p.projectId} className="text-slate-200">
                  <td className="py-3 pr-4">{p.projectName}</td>
                  <td className="py-3 pr-4">{money(p.financial.totalRevenue, p.financial.currency)}</td>
                  <td className="py-3 pr-4">
                    {money(p.financial.recurringRevenue, p.financial.currency)}
                  </td>
                  <td className="py-3 pr-4">{p.financial.transactionCount}</td>
                  <td className="py-3 pr-4">
                    {money(p.financial.averageTransactionValue, p.financial.currency)}
                  </td>
                  <td className="py-3 pr-4 text-slate-400">
                    {trendCell(p.trend.revenueGrowthPercent)}
                  </td>
                  <td className="py-3 pr-4 text-slate-400">
                    {trendCell(p.trend.transactionGrowthPercent)}
                  </td>
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

        <p className="text-xs text-slate-500 mt-4">
          Growth columns show N/A until a previous financial snapshot is stored for comparison.
        </p>
      </Card>
    </div>
  );
}
