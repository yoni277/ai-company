import type { CompanyContext, CtoOutput, ReportType } from '@ai-company/shared-types';

export interface CtoLlmClient {
  generate(ctx: CompanyContext, reportType: ReportType): Promise<CtoOutput>;
}

/** Defensive narrowing so a malformed model response throws before we persist it. */
export function ensureCtoOutput(value: unknown): CtoOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('CtoOutput: not an object');
  }
  const v = value as Record<string, unknown>;
  for (const k of [
    'headline',
    'platformHealth',
    'perProjectEngineering',
    'topTechnicalRisks',
    'techDebtItems',
    'engineeringPriorities',
  ]) {
    if (!(k in v)) throw new Error(`CtoOutput: missing field "${k}"`);
  }
  if (!Array.isArray(v.perProjectEngineering))
    throw new Error('CtoOutput: perProjectEngineering must be array');
  if (!Array.isArray(v.topTechnicalRisks))
    throw new Error('CtoOutput: topTechnicalRisks must be array');
  if (!Array.isArray(v.techDebtItems))
    throw new Error('CtoOutput: techDebtItems must be array');
  if (!Array.isArray(v.engineeringPriorities))
    throw new Error('CtoOutput: engineeringPriorities must be array');

  return {
    ...(v as unknown as CtoOutput),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
