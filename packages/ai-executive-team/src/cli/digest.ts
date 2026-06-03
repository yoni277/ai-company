#!/usr/bin/env tsx
import { createRepositories } from '@ai-company/database';
import { buildDefaultExecutiveTeam, runBoardDigest } from '../executive-team';

async function main() {
  const repos = createRepositories({ dataMode: 'mock' });
  const team = buildDefaultExecutiveTeam(repos, [
    { id: 'chief-of-staff', displayName: 'AI Chief of Staff' },
    { id: 'cto', displayName: 'AI CTO' },
    { id: 'coo', displayName: 'AI COO' },
    { id: 'cfo', displayName: 'AI CFO' },
    { id: 'vp-marketing', displayName: 'AI VP Marketing' },
    { id: 'vp-sales', displayName: 'AI VP Sales' },
  ]);
  const reportType =
    (process.argv[2] as 'daily_briefing' | 'weekly_report' | 'ad_hoc') ?? 'daily_briefing';
  const { output } = await runBoardDigest(repos, team, reportType);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
