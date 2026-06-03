import type { ExecutiveTeamInput } from '../input';
import { boardDigestSchemaText } from './schema';

export function boardDigestPrompt(input: ExecutiveTeamInput): string {
  return [
    "You are producing the CEO's BOARD-LEVEL DIGEST.",
    'You are the AI Executive Team — you synthesize what the other AI executives reported.',
    'You are NOT another executive lens. You read their outputs and find:',
    '  1. CONVERGENCE — where 2+ executives flagged the same project or theme.',
    '  2. TENSION — where executives explicitly disagree (e.g., CFO recommends reduce, Marketing recommends invest, on the same project).',
    '  3. STRATEGIC MOVES — top board-level moves that synthesize per-executive priorities (with attribution to the executives whose recommendations support each move).',
    '  4. CEO OPEN QUESTIONS — decisions the synthesis cannot resolve and the CEO must.',
    '',
    'For each executive, surface their headline, current health read, and top priority in executiveSnapshot.',
    'Be terse. Each item <= 2 sentences. Do not invent facts not present in the briefs.',
    'If an executive has no report yet (empty headline / health), include them in executiveSnapshot with empty fields rather than omitting them.',
    '',
    'Return ONLY valid JSON matching this TypeScript type:',
    boardDigestSchemaText,
    '',
    'Executive Team input (JSON):',
    JSON.stringify(input, null, 2),
  ].join('\n');
}
