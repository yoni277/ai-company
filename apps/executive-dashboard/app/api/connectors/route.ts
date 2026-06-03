import { NextResponse } from 'next/server';
import { getPlatform } from '../../../lib/platform';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { registry, repos } = getPlatform();
  const projects = await repos.projects.list();
  const projectBySlug = new Map(projects.map((p) => [p.slug, p]));

  const out = await Promise.all(
    registry.list().map(async (c) => {
      const project = projectBySlug.get(c.projectSlug);
      const sources = project ? await repos.dataSources.listByProject(project.id) : [];
      const own = sources.find((s) => s.sourceType === c.name);
      return {
        name: c.name,
        displayName: c.displayName,
        projectSlug: c.projectSlug,
        status: own?.status ?? 'unknown',
        lastSync: own?.lastSync ?? null,
      };
    }),
  );

  return NextResponse.json(out);
}
