import { NextResponse } from 'next/server';
import { loadPortfolioIntelligenceForDashboard } from '../../../../lib/portfolio-intelligence';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await loadPortfolioIntelligenceForDashboard();
  return NextResponse.json(result);
}
