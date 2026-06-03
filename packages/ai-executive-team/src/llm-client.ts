import type { BoardDigestOutput } from '@ai-company/shared-types';
import type { ExecutiveTeamInput } from './input';

export interface ExecutiveTeamLlmClient {
  generate(input: ExecutiveTeamInput): Promise<BoardDigestOutput>;
}

/**
 * Validate the synthesis payload. Required scalars must be present; array fields
 * default to `[]` when the model omits them. This is especially common for the
 * executive team output, which legitimately may emit `tensions: []` or
 * `ceoOpenQuestions: []` when nothing is disputed.
 */
export function ensureBoardDigestOutput(value: unknown): BoardDigestOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('BoardDigestOutput: not an object');
  }
  const v = value as Record<string, unknown>;

  if (typeof v.headline !== 'string') {
    throw new Error('BoardDigestOutput: missing or non-string field "headline"');
  }
  if (typeof v.companyVerdict !== 'string') {
    throw new Error('BoardDigestOutput: missing or non-string field "companyVerdict"');
  }

  const arrayField = <T>(name: keyof BoardDigestOutput): T[] => {
    const raw = v[name as string];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      throw new Error(`BoardDigestOutput: "${String(name)}" must be an array when present`);
    }
    return raw as T[];
  };

  return {
    headline: v.headline,
    companyVerdict: v.companyVerdict as BoardDigestOutput['companyVerdict'],
    executiveSnapshot: arrayField<BoardDigestOutput['executiveSnapshot'][number]>(
      'executiveSnapshot',
    ),
    convergentThemes: arrayField<BoardDigestOutput['convergentThemes'][number]>(
      'convergentThemes',
    ),
    tensions: arrayField<BoardDigestOutput['tensions'][number]>('tensions'),
    strategicMoves: arrayField<BoardDigestOutput['strategicMoves'][number]>('strategicMoves'),
    ceoOpenQuestions: arrayField<string>('ceoOpenQuestions'),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
