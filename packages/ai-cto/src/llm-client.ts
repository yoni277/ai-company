import type { CompanyContext, CtoOutput, ReportType } from '@ai-company/shared-types';

export interface CtoLlmClient {
  generate(ctx: CompanyContext, reportType: ReportType): Promise<CtoOutput>;
}

/**
 * Validate the LLM payload. Required scalars must be present; array fields default
 * to `[]` when the model omits them. Tolerant by design — Claude occasionally skips
 * fields when they would be empty arrays, and we treat that as semantically valid.
 */
export function ensureCtoOutput(value: unknown): CtoOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('CtoOutput: not an object');
  }
  const v = value as Record<string, unknown>;

  if (typeof v.headline !== 'string') {
    throw new Error('CtoOutput: missing or non-string field "headline"');
  }
  if (typeof v.platformHealth !== 'string') {
    throw new Error('CtoOutput: missing or non-string field "platformHealth"');
  }

  const arrayField = <T>(name: keyof CtoOutput): T[] => {
    const raw = v[name as string];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      throw new Error(`CtoOutput: "${String(name)}" must be an array when present`);
    }
    return raw as T[];
  };

  return {
    headline: v.headline,
    platformHealth: v.platformHealth as CtoOutput['platformHealth'],
    perProjectEngineering: arrayField<CtoOutput['perProjectEngineering'][number]>(
      'perProjectEngineering',
    ),
    topTechnicalRisks: arrayField<CtoOutput['topTechnicalRisks'][number]>('topTechnicalRisks'),
    techDebtItems: arrayField<CtoOutput['techDebtItems'][number]>('techDebtItems'),
    engineeringPriorities: arrayField<CtoOutput['engineeringPriorities'][number]>(
      'engineeringPriorities',
    ),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
