import type { CompanyContext, ReportType, VpMarketingOutput } from '@ai-company/shared-types';

export interface VpMarketingLlmClient {
  generate(ctx: CompanyContext, reportType: ReportType): Promise<VpMarketingOutput>;
}

export function ensureVpMarketingOutput(value: unknown): VpMarketingOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('VpMarketingOutput: not an object');
  }
  const v = value as Record<string, unknown>;
  for (const k of [
    'headline',
    'marketingHealth',
    'perProjectMarketing',
    'campaignIdeas',
    'growthRisks',
    'marketingPriorities',
  ]) {
    if (!(k in v)) throw new Error(`VpMarketingOutput: missing field "${k}"`);
  }
  if (!Array.isArray(v.perProjectMarketing))
    throw new Error('VpMarketingOutput: perProjectMarketing must be array');
  if (!Array.isArray(v.campaignIdeas))
    throw new Error('VpMarketingOutput: campaignIdeas must be array');
  if (!Array.isArray(v.growthRisks))
    throw new Error('VpMarketingOutput: growthRisks must be array');
  if (!Array.isArray(v.marketingPriorities))
    throw new Error('VpMarketingOutput: marketingPriorities must be array');

  return {
    ...(v as unknown as VpMarketingOutput),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
