import type { CompanyContext, ReportType, VpMarketingOutput } from '@ai-company/shared-types';

export interface VpMarketingLlmClient {
  generate(ctx: CompanyContext, reportType: ReportType): Promise<VpMarketingOutput>;
}

/**
 * Validate the LLM payload. Required scalars must be present; array fields default
 * to `[]` when the model omits them. This guards against benign tool-use schema drift
 * (e.g. Claude skipping `growthRisks` when there are none to surface) without
 * silently corrupting the report shape.
 */
export function ensureVpMarketingOutput(value: unknown): VpMarketingOutput {
  if (!value || typeof value !== 'object') {
    throw new Error('VpMarketingOutput: not an object');
  }
  const v = value as Record<string, unknown>;

  // Load-bearing scalars — fail loudly if absent.
  if (typeof v.headline !== 'string') {
    throw new Error('VpMarketingOutput: missing or non-string field "headline"');
  }
  if (typeof v.marketingHealth !== 'string') {
    throw new Error('VpMarketingOutput: missing or non-string field "marketingHealth"');
  }

  // Array fields default to []. If present, must actually be an array.
  const arrayField = <T>(name: keyof VpMarketingOutput): T[] => {
    const raw = v[name as string];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      throw new Error(`VpMarketingOutput: "${String(name)}" must be an array when present`);
    }
    return raw as T[];
  };

  const perProjectMarketing = arrayField<VpMarketingOutput['perProjectMarketing'][number]>(
    'perProjectMarketing',
  );
  const campaignIdeas = arrayField<VpMarketingOutput['campaignIdeas'][number]>('campaignIdeas');
  const growthRisks = arrayField<VpMarketingOutput['growthRisks'][number]>('growthRisks');
  const marketingPriorities = arrayField<VpMarketingOutput['marketingPriorities'][number]>(
    'marketingPriorities',
  );

  return {
    headline: v.headline,
    marketingHealth: v.marketingHealth as VpMarketingOutput['marketingHealth'],
    perProjectMarketing,
    campaignIdeas,
    growthRisks,
    marketingPriorities,
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
}
