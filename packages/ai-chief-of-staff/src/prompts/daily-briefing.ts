import type { CompanyContext } from '@ai-company/shared-types';
import { chiefOfStaffOutputSchemaText } from './schema.js';

export function dailyBriefingPrompt(ctx: CompanyContext): string {
  return [
    'You are producing the CEO\'s DAILY BRIEFING.',
    'Use only the company context below; do not invent facts.',
    'Be terse. Each project summary <= 2 sentences. Each recommended action <= 1 sentence.',
    '',
    'Return ONLY valid JSON matching this TypeScript type:',
    chiefOfStaffOutputSchemaText,
    '',
    'Company context (JSON):',
    JSON.stringify(ctx, null, 2),
  ].join('\n');
}
