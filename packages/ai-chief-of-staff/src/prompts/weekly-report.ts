import type { CompanyContext } from '@ai-company/shared-types';
import { chiefOfStaffOutputSchemaText } from './schema.js';

export function weeklyReportPrompt(ctx: CompanyContext): string {
  return [
    'You are producing the CEO\'s WEEKLY EXECUTIVE REPORT.',
    'Frame per-project summaries as week-over-week changes when metrics support it.',
    'Surface 3 CEO priorities for the coming week, ranked.',
    'Use only the company context below; do not invent facts.',
    '',
    'Return ONLY valid JSON matching this TypeScript type:',
    chiefOfStaffOutputSchemaText,
    '',
    'Company context (JSON):',
    JSON.stringify(ctx, null, 2),
  ].join('\n');
}
