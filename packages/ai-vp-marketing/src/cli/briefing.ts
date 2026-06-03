#!/usr/bin/env tsx
/**
 * Local CLI: generate an AI VP Marketing briefing against in-memory data.
 *
 *   pnpm --filter @ai-company/ai-vp-marketing cli:briefing
 */
import { createRepositories } from '@ai-company/database';
import { buildDefaultVpMarketing, runVpMarketingBriefing } from '../executive';

async function main() {
  const repos = createRepositories({ dataMode: 'mock' });
  const vp = buildDefaultVpMarketing();
  const reportType =
    (process.argv[2] as 'daily_briefing' | 'weekly_report' | 'ad_hoc') ?? 'daily_briefing';
  const { output } = await runVpMarketingBriefing(repos, vp, reportType);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
