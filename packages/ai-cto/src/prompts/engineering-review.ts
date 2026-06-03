import type { CompanyContext } from '@ai-company/shared-types';
import { ctoOutputSchemaText } from './schema';

export function engineeringReviewPrompt(ctx: CompanyContext): string {
  return [
    "You are producing the CEO's WEEKLY ENGINEERING REVIEW.",
    'You are the AI CTO. Frame summaries as week-level trends in reliability, performance, and tech debt.',
    'Surface 3 engineering priorities for the coming week, ranked.',
    'Use only the company context below; do not invent facts.',
    '',
    'Return ONLY valid JSON matching this TypeScript type:',
    ctoOutputSchemaText,
    '',
    'Company context (JSON):',
    JSON.stringify(ctx, null, 2),
  ].join('\n');
}
