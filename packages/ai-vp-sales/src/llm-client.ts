import type { CompanyContext, ReportType, VpSalesOutput } from '@ai-company/shared-types';

export interface VpSalesLlmClient {
  generate(ctx: CompanyContext, reportType: ReportType): Promise<VpSalesOutput>;
}

export function ensureVpSalesOutput(value: unknown): VpSalesOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('VpSalesOutput: not an object');
  }
  const v = value as Record<string, unknown>;

  if (typeof v.headline !== 'string') {
    throw new Error('VpSalesOutput: missing or non-string field "headline"');
  }
  if (typeof v.salesHealth !== 'string') {
    throw new Error('VpSalesOutput: missing or non-string field "salesHealth"');
  }

  const arrayField = <T>(name: keyof VpSalesOutput): T[] => {
    const raw = v[name as string];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      throw new Error(`VpSalesOutput: "${String(name)}" must be an array when present`);
    }
    return raw as T[];
  };

  const result: VpSalesOutput = {
    headline: v.headline,
    salesHealth: v.salesHealth as VpSalesOutput['salesHealth'],
    perProjectSales: arrayField<VpSalesOutput['perProjectSales'][number]>('perProjectSales'),
    deals: arrayField<VpSalesOutput['deals'][number]>('deals'),
    salesRisks: arrayField<VpSalesOutput['salesRisks'][number]>('salesRisks'),
    salesPriorities: arrayField<VpSalesOutput['salesPriorities'][number]>('salesPriorities'),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };

  if (v.forecastSummary && typeof v.forecastSummary === 'object') {
    result.forecastSummary = v.forecastSummary as NonNullable<VpSalesOutput['forecastSummary']>;
  }

  return result;
}
