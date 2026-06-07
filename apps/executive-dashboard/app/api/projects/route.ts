import { NextResponse } from 'next/server';
import {
  InvalidProjectInputError,
  ProjectAlreadyExistsError,
} from '@ai-company/database';
import type { CreateProjectInput, ProjectHealth } from '@ai-company/shared-types';
import { getPlatform } from '../../../lib/platform';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const VALID_STATUSES: readonly ProjectHealth[] = [
  'healthy',
  'at_risk',
  'critical',
  'paused',
  'archived',
];

function isProjectHealth(value: unknown): value is ProjectHealth {
  return typeof value === 'string' && (VALID_STATUSES as readonly string[]).includes(value);
}

/**
 * GET — list all registered projects. Existing callers (dashboard pages,
 * external integrations) keep the same response shape: a JSON array.
 */
export async function GET() {
  try {
    const { repos } = getPlatform();
    const projects = await repos.projects.list();
    return NextResponse.json(projects);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list projects' },
      { status: 500 },
    );
  }
}

/**
 * P006 — POST /api/projects.
 *
 * Single insert path for new project rows. Connectors no longer create
 * state; this is how operators or future UI register a project.
 *
 * Body shape:
 *   { slug, name, description, status, createdBy }
 *
 * `createdBy` is required and must be non-empty. Recommended values:
 *   'ceo' | 'operator' | 'migration' | '<concrete user id>'
 *
 * Doctrine: D023 + D038. The endpoint refuses anonymous registration so the
 * audit trail always answers "who created this project, when, and why".
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<CreateProjectInput>;

    if (typeof body.slug !== 'string' || !body.slug.trim()) {
      return NextResponse.json(
        { error: 'slug must be a non-empty string' },
        { status: 400 },
      );
    }
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { error: 'name must be a non-empty string' },
        { status: 400 },
      );
    }
    if (typeof body.description !== 'string') {
      return NextResponse.json(
        { error: 'description must be a string' },
        { status: 400 },
      );
    }
    if (!isProjectHealth(body.status)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 },
      );
    }
    if (typeof body.createdBy !== 'string' || !body.createdBy.trim()) {
      return NextResponse.json(
        { error: 'createdBy is required and must be non-empty' },
        { status: 400 },
      );
    }

    const { repos } = getPlatform();
    const project = await repos.projects.create({
      slug: body.slug.trim(),
      name: body.name.trim(),
      description: body.description,
      status: body.status,
      createdBy: body.createdBy.trim(),
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    if (e instanceof ProjectAlreadyExistsError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    if (e instanceof InvalidProjectInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create project' },
      { status: 500 },
    );
  }
}
