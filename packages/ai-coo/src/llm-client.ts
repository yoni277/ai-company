import type { CompanyContext, CooOutput, ReportType } from '@ai-company/shared-types';

export interface CooLlmClient {
  generate(ctx: CompanyContext, reportType: ReportType): Promise<CooOutput>;
}

export function ensureCooOutput(value: unknown): CooOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('CooOutput: not an object');
  }
  const v = value as Record<string, unknown>;
  for (const k of [
    'headline',
    'operationsHealth',
    'perProjectOperations',
    'bottlenecks',
    'vendorHealth',
    'operationalPriorities',
  ]) {
    if (!(k in v)) throw new Error(`CooOutput: missing field "${k}"`);
  }
  if (!Array.isArray(v.perProjectOperations))
    throw new Error('CooOutput: perProjectOperations must be array');
  if (!Array.isArray(v.bottlenecks)) throw new Error('CooOutput: bottlenecks must be array');
  if (!Array.isArray(v.vendorHealth)) throw new Error('CooOutput: vendorHealth must be array');
  if (!Array.isArray(v.operationalPriorities))
    throw new Error('CooOutput: operationalPriorities must be array');

  return {
    ...(v as unknown as CooOutput),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
