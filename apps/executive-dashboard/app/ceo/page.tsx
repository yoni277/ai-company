import Link from 'next/link';
import { ensureSeededMockData, getPlatform } from '../../lib/platform';
import { loadCommandCenterData } from '../../lib/command-center';
import { CommandCenterView } from '../../components/command-center/CommandCenterView';
import { CommandCenterGoalsRow } from '../../components/command-center/CommandCenterLayout';
import { WeeklyGoalsWidget } from '../../components/command-center/WeeklyGoalsWidget';
import { CeoOperatingSystemPanels } from '../../components/command-center/CeoOperatingSystemPanels';
import { listActiveDirectives, listDecisions } from '../../lib/ceo-operating-system';

export const dynamic = 'force-dynamic';

export default async function CeoCommandCenterPage() {
  await ensureSeededMockData();
  const { repos } = getPlatform();
  const [data, directives, decisions] = await Promise.all([
    loadCommandCenterData(repos),
    listActiveDirectives(),
    listDecisions(),
  ]);
  const recommendedActions = data.portfolio.actionQueue?.actions ?? [];

  return (
    <div dir="rtl" lang="he" className="space-y-6 max-w-[90rem]">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div className="text-start">
          <h1 className="text-2xl font-semibold text-slate-100">מרכז פיקוד מנכ&quot;ל</h1>
          <p className="text-sm text-slate-500 mt-1">
            Executive Command Center · תמונת מצב אחת לכל הפורטפוליו
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/"
            className="text-slate-400 hover:text-slate-200 transition"
          >
            Overview מפורט ←
          </Link>
          <Link
            href="/chief-of-staff"
            className="text-slate-400 hover:text-slate-200 transition"
          >
            Daily brief ←
          </Link>
        </div>
      </header>

      <CommandCenterView data={data} />
      <CommandCenterGoalsRow>
        <WeeklyGoalsWidget />
      </CommandCenterGoalsRow>

      <CeoOperatingSystemPanels
        initialDirectives={directives}
        initialDecisions={decisions}
        recommendedActions={recommendedActions}
      />
    </div>
  );
}
