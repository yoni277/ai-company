import { NextResponse } from 'next/server';
import type { CreateTaskOutcomeInput } from '@ai-company/shared-types';
import { validateCreateOutcomeInput } from '@ai-company/doos-core';
import {
  EmptyRecordedByError,
  InvalidOutcomeInputError,
} from '@ai-company/database';
import { getPlatform } from '../../../../../lib/platform';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * P008 — GET outcomes for a task.
 *
 * Returns the full list, newest first. No aggregation, no rollup — that's
 * P009+ territory.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { repos } = getPlatform();
    const [task, outcomes] = await Promise.all([
      repos.tasks.getById(id),
      repos.taskOutcomes.listByTask(id),
    ]);
    if (!task) return NextResponse.json({ error: 'task not found' }, { status: 404 });
    return NextResponse.json({ outcomes });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list outcomes' },
      { status: 500 },
    );
  }
}

/**
 * P008 — Create a TaskOutcome.
 *
 * Append-only by doctrine — no PATCH, no DELETE companion endpoint. Input
 * is validated by the deterministic doos-core validator (identifier regex,
 * direction-math consistency, ISO timestamps, window invariants,
 * source/sourceRef coupling). The DB check constraints are the second
 * line of defense — they catch direct-SQL bypasses.
 *
 * Body shape:
 *   {
 *     metricName: string,            // /^[a-z][a-z0-9_]*$/
 *     metricUnit?: string,
 *     baselineValue: number,
 *     observedValue: number,
 *     direction: 'increase' | 'decrease' | 'unchanged',
 *     observedAt: ISO,
 *     windowStart: ISO,
 *     windowEnd: ISO,
 *     source: 'manual' | 'connector_metric' | 'verified_measurement',
 *     sourceRef?: string,            // required when source is non-manual
 *     recordedBy: string,            // required, non-empty
 *     notes?: string
 *   }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const raw = (await request.json().catch(() => ({}))) as Partial<CreateTaskOutcomeInput>;

    const input: CreateTaskOutcomeInput = {
      taskId: id,
      metricName: typeof raw.metricName === 'string' ? raw.metricName : '',
      metricUnit: raw.metricUnit ?? null,
      baselineValue:
        typeof raw.baselineValue === 'number' ? raw.baselineValue : Number.NaN,
      observedValue:
        typeof raw.observedValue === 'number' ? raw.observedValue : Number.NaN,
      direction: raw.direction as CreateTaskOutcomeInput['direction'],
      observedAt: typeof raw.observedAt === 'string' ? raw.observedAt : '',
      windowStart: typeof raw.windowStart === 'string' ? raw.windowStart : '',
      windowEnd: typeof raw.windowEnd === 'string' ? raw.windowEnd : '',
      source: raw.source as CreateTaskOutcomeInput['source'],
      sourceRef: raw.sourceRef ?? null,
      recordedBy: typeof raw.recordedBy === 'string' ? raw.recordedBy : '',
      notes: raw.notes ?? null,
    };

    const v = validateCreateOutcomeInput(input);
    if (!v.valid) {
      return NextResponse.json(
        { error: 'invalid outcome input', reasons: v.reasons },
        { status: 400 },
      );
    }

    // Confirm task exists before writing (clearer 404 than a FK violation).
    const { repos } = getPlatform();
    const task = await repos.tasks.getById(id);
    if (!task) return NextResponse.json({ error: 'task not found' }, { status: 404 });

    const outcome = await repos.taskOutcomes.create(input);
    return NextResponse.json({ outcome }, { status: 201 });
  } catch (e) {
    if (e instanceof EmptyRecordedByError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof InvalidOutcomeInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to record outcome' },
      { status: 500 },
    );
  }
}
