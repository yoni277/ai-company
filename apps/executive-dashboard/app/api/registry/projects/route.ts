import { NextResponse } from 'next/server';
import { loadPortfolioIntelligenceForDashboard } from '../../../../lib/portfolio-intelligence';
import { loadProjectRegistryView } from '../../../../lib/project-registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { portfolio } = await loadPortfolioIntelligenceForDashboard();
  const registry = await loadProjectRegistryView(portfolio);
  return NextResponse.json(registry);
}
