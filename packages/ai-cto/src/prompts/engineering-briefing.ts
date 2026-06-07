import type { CompanyContext } from '@ai-company/shared-types';
import { buildDirectiveSection } from '@ai-company/ai-chief-of-staff';
import { ctoOutputSchemaText } from './schema';

export function engineeringBriefingPrompt(ctx: CompanyContext): string {
  const directiveSection = buildDirectiveSection(ctx);
  return [
    "You are producing the CEO's DAILY ENGINEERING BRIEFING.",
    'You are the AI CTO — interpret the context through an engineering lens, not a business lens.',
    'Focus on: reliability (incidents, p99 latency), security signals, infrastructure scaling, and tech debt.',
    'Ignore business metrics like revenue unless they directly indicate a system-load concern.',
    'Be terse. Each summary <= 2 sentences. Each recommended action <= 1 sentence.',
    'Use only the company context below; do not invent facts or fabricate metrics.',
    ...(directiveSection ? ['', directiveSection] : []),
    '',
    'Return ONLY valid JSON matching this TypeScript type:',
    ctoOutputSchemaText,
    '',
    'Company context (JSON):',
    JSON.stringify(ctx, null, 2),
  ].join('\n');
}
