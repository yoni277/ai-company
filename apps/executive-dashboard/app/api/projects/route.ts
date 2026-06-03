import { NextResponse } from 'next/server';
import { ensureSeededMockData, getPlatform } from '../../../lib/platform';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureSeededMockData();
  const { repos } = getPlatform();
  const projects = await repos.projects.list();
  return NextResponse.json(projects);
}
