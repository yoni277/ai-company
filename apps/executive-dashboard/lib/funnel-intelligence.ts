import 'server-only';
import { loadPortfolioIntelligenceForDashboard } from './portfolio-intelligence';
import type { FunnelSnapshot } from '@ai-company/shared-types';

export async function loadFunnelSnapshots(): Promise<FunnelSnapshot[]> {
  const { funnels } = await loadPortfolioIntelligenceForDashboard();
  return funnels;
}
