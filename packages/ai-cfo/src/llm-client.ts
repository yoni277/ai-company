import type { CfoOutput, CompanyContext, ReportType } from '@ai-company/shared-types';

export interface CfoLlmClient {
  generate(ctx: CompanyContext, reportType: ReportType): Promise<CfoOutput>;
}

export function ensureCfoOutput(value: unknown): CfoOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('CfoOutput: not an object');
  }
  const v = value as Record<string, unknown>;

  if (typeof v.headline !== 'string') {
    throw new Error('CfoOutput: missing or non-string field "headline"');
  }
  if (typeof v.financialHealth !== 'string') {
    throw new Error('CfoOutput: missing or non-string field "financialHealth"');
  }

  const arrayField = <T>(name: keyof CfoOutput): T[] => {
    const raw = v[name as string];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      throw new Error(`CfoOutput: "${String(name)}" must be an array when present`);
    }
    return raw as T[];
  };

  const result: CfoOutput = {
    headline: v.headline,
    financialHealth: v.financialHealth as CfoOutput['financialHealth'],
    perProjectFinancials: arrayField<CfoOutput['perProjectFinancials'][number]>(
      'perProjectFinancials',
    ),
    financialRisks: arrayField<CfoOutput['financialRisks'][number]>('financialRisks'),
    capitalAllocations: arrayField<CfoOutput['capitalAllocations'][number]>('capitalAllocations'),
    financialPriorities: arrayField<CfoOutput['financialPriorities'][number]>(
      'financialPriorities',
    ),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };

  // cashSnapshot is optional, pass it through if shaped correctly.
  if (v.cashSnapshot && typeof v.cashSnapshot === 'object') {
    result.cashSnapshot = v.cashSnapshot as NonNullable<CfoOutput['cashSnapshot']>;
  }

  return result;
}
