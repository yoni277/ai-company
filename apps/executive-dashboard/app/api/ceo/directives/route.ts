import { NextResponse } from 'next/server';
import type { CreateCEODirectiveInput } from '@ai-company/shared-types';
import { createDirective, listActiveDirectives } from '../../../../lib/ceo-operating-system';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const directives = await listActiveDirectives();
    return NextResponse.json({ directives });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load directives' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCEODirectiveInput;
    if (!body.title?.trim() || !body.directive?.trim() || !body.category || !body.priority) {
      return NextResponse.json({ error: 'title, directive, category, and priority are required' }, { status: 400 });
    }
    const directive = await createDirective({
      title: body.title.trim(),
      directive: body.directive.trim(),
      category: body.category,
      priority: body.priority,
      active: body.active ?? true,
      expiresAt: body.expiresAt ?? null,
      isOverride: body.isOverride ?? false,
      targetProjectId: body.targetProjectId ?? null,
    });
    return NextResponse.json({ directive }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create directive' },
      { status: 500 },
    );
  }
}
