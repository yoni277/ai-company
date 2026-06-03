#!/usr/bin/env tsx
/**
 * Local CLI: generate a Chief of Staff briefing against in-memory data.
 * Useful for smoke-testing the pipeline without running the dashboard.
 *
 *   pnpm chief:briefing
 */
import { createRepositories } from '@ai-company/database';
import { buildDefaultChiefOfStaff, runBriefing } from '../executive.js';

async function main() {
  const repos = createRepositories({ dataMode: 'mock' });
  const chief = buildDefaultChiefOfStaff();
  const reportType = (process.argv[2] as 'daily_briefing' | 'weekly_report' | 'ad_hoc') ?? 'daily_briefing';
  const { output } = await runBriefing(repos, chief, reportType);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
