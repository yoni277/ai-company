import type { CompanyContext } from '@ai-company/shared-types';
import { vpMarketingOutputSchemaText } from './schema';

export function marketingBriefingPrompt(ctx: CompanyContext): string {
  return [
    "You are producing the CEO's DAILY MARKETING BRIEFING.",
    'You are the AI VP Marketing — interpret the context through a growth lens, not a business or engineering lens.',
    'Map metrics to the pirate-metrics funnel: awareness → acquisition → activation → retention → referral → revenue.',
    'Propose concrete, channel-aware campaign ideas where the context supports them.',
    'Surface risks that threaten growth (churn signal, acquisition stall, CAC blowup, broken activation).',
    'Be terse. Each summary <= 2 sentences. Each recommended action / expected impact <= 1 sentence.',
    'Use only the company context below; do not invent facts or fabricate metrics.',
    '',
    'Return ONLY valid JSON matching this TypeScript type:',
    vpMarketingOutputSchemaText,
    '',
    'Company context (JSON):',
    JSON.stringify(ctx, null, 2),
  ].join('\n');
}
