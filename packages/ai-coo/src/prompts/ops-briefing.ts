import type { CompanyContext } from '@ai-company/shared-types';
import { cooOutputSchemaText } from './schema';

export function opsBriefingPrompt(ctx: CompanyContext): string {
  return [
    "You are producing the CEO's DAILY OPERATIONS BRIEFING.",
    'You are the AI COO — interpret the context through an operations lens.',
    'Focus on: throughput, SLA adherence, queue health, vendor dependencies, and process bottlenecks.',
    'Ignore engineering internals (latency micro-optimization, code) and marketing (campaigns).',
    'Be terse. Each summary <= 2 sentences. Each recommended action <= 1 sentence.',
    'Use only the company context below; do not invent vendor names, SLA targets, or queue depths.',
    '',
    'Return ONLY valid JSON matching this TypeScript type:',
    cooOutputSchemaText,
    '',
    'Company context (JSON):',
    JSON.stringify(ctx, null, 2),
  ].join('\n');
}
