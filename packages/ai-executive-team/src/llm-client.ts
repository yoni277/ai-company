import type { BoardDigestOutput } from '@ai-company/shared-types';
import type { ExecutiveTeamInput } from './input';

export interface ExecutiveTeamLlmClient {
  generate(input: ExecutiveTeamInput): Promise<BoardDigestOutput>;
}

export function ensureBoardDigestOutput(value: unknown): BoardDigestOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('BoardDigestOutput: not an object');
  }
  const v = value as Record<string, unknown>;
  for (const k of [
    'headline',
    'companyVerdict',
    'executiveSnapshot',
    'convergentThemes',
    'tensions',
    'strategicMoves',
    'ceoOpenQuestions',
  ]) {
    if (!(k in v)) throw new Error(`BoardDigestOutput: missing field "${k}"`);
  }
  if (!Array.isArray(v.executiveSnapshot))
    throw new Error('BoardDigestOutput: executiveSnapshot must be array');
  if (!Array.isArray(v.convergentThemes))
    throw new Error('BoardDigestOutput: convergentThemes must be array');
  if (!Array.isArray(v.tensions)) throw new Error('BoardDigestOutput: tensions must be array');
  if (!Array.isArray(v.strategicMoves))
    throw new Error('BoardDigestOutput: strategicMoves must be array');
  if (!Array.isArray(v.ceoOpenQuestions))
    throw new Error('BoardDigestOutput: ceoOpenQuestions must be array');

  return {
    ...(v as unknown as BoardDigestOutput),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
