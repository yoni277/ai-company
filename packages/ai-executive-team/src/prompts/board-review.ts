import type { ExecutiveTeamInput } from '../input';
import { boardDigestSchemaText } from './schema';

export function boardReviewPrompt(input: ExecutiveTeamInput): string {
  return [
    "You are producing the WEEKLY BOARD REVIEW.",
    'You are the AI Executive Team. Frame convergent themes and tensions as week-over-week movement when the briefs support it.',
    'Surface 3-5 strategic moves for the coming week, ranked, each citing the contributing executives.',
    'Do not invent week-over-week movement; if briefs only show a single snapshot, say so in the rationale.',
    '',
    'Return ONLY valid JSON matching this TypeScript type:',
    boardDigestSchemaText,
    '',
    'Executive Team input (JSON):',
    JSON.stringify(input, null, 2),
  ].join('\n');
}
