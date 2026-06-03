import type { CompanyContext } from '@ai-company/shared-types';
import { vpSalesOutputSchemaText } from './schema';

export function salesBriefingPrompt(ctx: CompanyContext): string {
  return [
    "You are producing the CEO's DAILY SALES BRIEFING.",
    'You are the AI VP Sales — interpret the context through a pipeline lens.',
    'Focus on: pipeline stage distribution, deal velocity, named accounts, forecast vs quota.',
    'Where context names specific customers / prospects / pilots, surface them as deals with a next action.',
    'Be terse. Each summary <= 2 sentences. Each next action <= 1 sentence.',
    'Use only the company context below; do not invent deals, customer names, or dollar values.',
    '',
    'Return ONLY valid JSON matching this TypeScript type:',
    vpSalesOutputSchemaText,
    '',
    'Company context (JSON):',
    JSON.stringify(ctx, null, 2),
  ].join('\n');
}
