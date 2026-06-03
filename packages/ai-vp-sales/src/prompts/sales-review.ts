import type { CompanyContext } from '@ai-company/shared-types';
import { vpSalesOutputSchemaText } from './schema';

export function salesReviewPrompt(ctx: CompanyContext): string {
  return [
    "You are producing the CEO's WEEKLY SALES REVIEW.",
    'You are the AI VP Sales. Frame summaries as week-level pipeline movement (stage transitions) and deal velocity.',
    'Surface 3 sales priorities for the coming week, ranked.',
    'Use only the company context below; do not invent facts.',
    '',
    'Return ONLY valid JSON matching this TypeScript type:',
    vpSalesOutputSchemaText,
    '',
    'Company context (JSON):',
    JSON.stringify(ctx, null, 2),
  ].join('\n');
}
