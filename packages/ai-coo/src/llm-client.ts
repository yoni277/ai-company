import type { CompanyContext, CooOutput, ReportType } from '@ai-company/shared-types';

export interface CooLlmClient {
  generate(ctx: CompanyContext, reportType: ReportType): Promise<CooOutput>;
}

export function ensureCooOutput(value: unknown): CooOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('CooOutput: not an object');
  }
  const v = value as Record<string, unknown>;

  if (typeof v.headline !== 'string') {
    throw new Error('CooOutput: missing or non-string field "headline"');
  }
  if (typeof v.operationsHealth !== 'string') {
    throw new Error('CooOutput: missing or non-string field "operationsHealth"');
  }

  const arrayField = <T>(name: keyof CooOutput): T[] => {
    const raw = v[name as string];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      throw new Error(`CooOutput: "${String(name)}" must be an array when present`);
    }
    return raw as T[];
  };

  return {
    headline: v.headline,
    operationsHealth: v.operationsHealth as CooOutput['operationsHealth'],
    perProjectOperations: arrayField<CooOutput['perProjectOperations'][number]>(
      'perProjectOperations',
    ),
    bottlenecks: arrayField<CooOutput['bottlenecks'][number]>('bottlenecks'),
    vendorHealth: arrayField<CooOutput['vendorHealth'][number]>('vendorHealth'),
    operationalPriorities: arrayField<CooOutput['operationalPriorities'][number]>(
      'operationalPriorities',
    ),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
