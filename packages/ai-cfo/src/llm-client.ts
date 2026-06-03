import type { CfoOutput, CompanyContext, ReportType } from '@ai-company/shared-types';

export interface CfoLlmClient {
  generate(ctx: CompanyContext, reportType: ReportType): Promise<CfoOutput>;
}

export function ensureCfoOutput(value: unknown): CfoOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('CfoOutput: not an object');
  }
  const v = value as Record<string, unknown>;
  for (const k of [
    'headline',
    'financialHealth',
    'perProjectFinancials',
    'financialRisks',
    'capitalAllocations',
    'financialPriorities',
  ]) {
    if (!(k in v)) throw new Error(`CfoOutput: missing field "${k}"`);
  }
  if (!Array.isArray(v.perProjectFinancials))
    throw new Error('CfoOutput: perProjectFinancials must be array');
  if (!Array.isArray(v.financialRisks))
    throw new Error('CfoOutput: financialRisks must be array');
  if (!Array.isArray(v.capitalAllocations))
    throw new Error('CfoOutput: capitalAllocations must be array');
  if (!Array.isArray(v.financialPriorities))
    throw new Error('CfoOutput: financialPriorities must be array');

  return {
    ...(v as unknown as CfoOutput),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
