import { NextResponse } from 'next/server';
import type { CreateEvidenceTokenInput } from '@ai-company/shared-types';
import { evaluateCompletionGate, validateCreateEvidenceInput } from '@ai-company/doos-core';
import { attachEvidence } from '../../../../../lib/doos';
import { getPlatform } from '../../../../../lib/platform';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * P007 — GET evidence + current completion gate state for a task.
 *
 * Returns { tokens, gate: { ready, reasons, validatorVersion } } so the UI
 * can render the gate banner alongside the evidence list in one round-trip.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { repos } = getPlatform();
    const [task, tokens] = await Promise.all([
      repos.tasks.getById(id),
      repos.evidenceTokens.listByTask(id),
    ]);
    if (!task) return NextResponse.json({ error: 'task not found' }, { status: 404 });
    const gate = evaluateCompletionGate(task, tokens);
    return NextResponse.json({ tokens, gate });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load evidence' },
      { status: 500 },
    );
  }
}

/**
 * P007 — Attach an evidence token to a task.
 *
 * Validates the input via the deterministic per-kind payload validator
 * (no LLM, no fuzzy matching). Tier is derived from `evidenceKind`; the
 * API rejects any caller-supplied `tier` field.
 *
 * Body:
 *   {
 *     evidenceKind: 'manual_note' | 'screenshot' | 'meeting_held' |
 *                   'document_produced' | 'message_sent' |
 *                   'metric_snapshot' | 'human_attestation' | 'other',
 *     payload: { ...kind-specific fields },
 *     sourceKind: 'manual' | 'connector_sync' | 'http_callback' | 'cli',
 *     sourceRef?: string,
 *     createdBy: string  // required, non-empty
 *     // human_attestation only:
 *     overrideReason?: string,
 *     approvedBy?: string,
 *     // optional, reserved:
 *     evidenceHash?: string
 *   }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const raw = (await request.json().catch(() => ({}))) as Partial<CreateEvidenceTokenInput> & {
      tier?: unknown;
    };
    if (raw.tier !== undefined) {
      return NextResponse.json(
        {
          error:
            'tier is derived from evidenceKind and may not be supplied — see EVIDENCE_KIND_TIER',
        },
        { status: 400 },
      );
    }
    const input: CreateEvidenceTokenInput = {
      evidenceKind: raw.evidenceKind as CreateEvidenceTokenInput['evidenceKind'],
      payload: (raw.payload ?? {}) as Record<string, unknown>,
      sourceKind: raw.sourceKind as CreateEvidenceTokenInput['sourceKind'],
      sourceRef: raw.sourceRef ?? null,
      createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : '',
      ...(raw.signedBy !== undefined ? { signedBy: raw.signedBy } : {}),
      ...(raw.evidenceHash !== undefined ? { evidenceHash: raw.evidenceHash } : {}),
      ...(raw.overrideReason !== undefined ? { overrideReason: raw.overrideReason } : {}),
      ...(raw.approvedBy !== undefined ? { approvedBy: raw.approvedBy } : {}),
    };
    const v = validateCreateEvidenceInput(input);
    if (!v.valid) {
      return NextResponse.json(
        { error: 'invalid evidence input', reasons: v.reasons },
        { status: 400 },
      );
    }
    const { token, validation } = await attachEvidence(id, input);
    return NextResponse.json({ token, validation }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to attach evidence' },
      { status: 500 },
    );
  }
}
