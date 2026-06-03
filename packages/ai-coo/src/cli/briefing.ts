#!/usr/bin/env tsx
import { createRepositories } from '@ai-company/database';
import { buildDefaultCoo, runCooBriefing } from '../executive';

async function main() {
  const repos = createRepositories({ dataMode: 'mock' });
  const coo = buildDefaultCoo();
  const reportType =
    (process.argv[2] as 'daily_briefing' | 'weekly_report' | 'ad_hoc') ?? 'daily_briefing';
  const { output } = await runCooBriefing(repos, coo, reportType);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
