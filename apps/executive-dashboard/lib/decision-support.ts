import 'server-only';
import { loadPortfolioIntelligenceForDashboard } from './portfolio-intelligence';
import type { DecisionSupportResult } from '@ai-company/shared-types';

export async function loadDecisionSupportResults(): Promise<DecisionSupportResult[]> {
  const { decisionSupport } = await loadPortfolioIntelligenceForDashboard();
  return decisionSupport;
}
