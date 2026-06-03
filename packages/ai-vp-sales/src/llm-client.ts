import type { CompanyContext, ReportType, VpSalesOutput } from '@ai-company/shared-types';

export interface VpSalesLlmClient {
  generate(ctx: CompanyContext, reportType: ReportType): Promise<VpSalesOutput>;
}

export function ensureVpSalesOutput(value: unknown): VpSalesOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('VpSalesOutput: not an object');
  }
  const v = value as Record<string, unknown>;
  for (const k of [
    'headline',
    'salesHealth',
    'perProjectSales',
    'deals',
    'salesRisks',
    'salesPriorities',
  ]) {
    if (!(k in v)) throw new Error(`VpSalesOutput: missing field "${k}"`);
  }
  if (!Array.isArray(v.perProjectSales))
    throw new Error('VpSalesOutput: perProjectSales must be array');
  if (!Array.isArray(v.deals)) throw new Error('VpSalesOutput: deals must be array');
  if (!Array.isArray(v.salesRisks)) throw new Error('VpSalesOutput: salesRisks must be array');
  if (!Array.isArray(v.salesPriorities))
    throw new Error('VpSalesOutput: salesPriorities must be array');

  return {
    ...(v as unknown as VpSalesOutput),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
