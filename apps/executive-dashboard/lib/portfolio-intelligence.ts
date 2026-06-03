import 'server-only';
import {
  loadPortfolioIntelligence,
  type PortfolioIntelligenceLoadResult,
} from '@ai-company/connector-portfolio-intelligence';

export type { PortfolioIntelligenceLoadResult };

export async function loadPortfolioIntelligenceForDashboard(): Promise<PortfolioIntelligenceLoadResult> {
  return loadPortfolioIntelligence();
}
