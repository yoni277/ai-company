'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CreateEvidenceTokenInput,
  EvidenceKind,
  EvidenceSourceKind,
  EvidenceToken,
} from '@ai-company/shared-types';

/**
 * P007 — Per-task evidence attachment + completion gate UI.
 *
 * Chief Architect constraints honored:
 *   - No bulk attach. One operator action = one record.
 *   - No AI suggestion. The kind picker is a fixed vocabulary.
 *   - No interpretation. Payload fields are literal facts per kind.
 *   - `other` is visually noisy — yellow banner + required justification.
 *   - Tier is not selectable. It is shown derived from the kind.
 *   - Complete is gated. Button disabled when gate.ready=false, with
 *     unmet reasons listed inline.
 */
const KIND_OPTIONS: ReadonlyArray<{
  value: EvidenceKind;
  label: string;
  tier: string;
  description: string;
}> = [
  { value: 'manual_note', label: 'Manual note', tier: 'E0', description: 'Operator commentary' },
  { value: 'screenshot', label: 'Screenshot', tier: 'E2', description: 'URL + timestamp' },
  { value: 'meeting_held', label: 'Meeting held', tier: 'E2', description: 'Attendees + duration' },
  {
    value: 'document_produced',
    label: 'Document produced',
    tier: 'E2',
    description: 'Title + URL',
  },
  { value: 'message_sent', label: 'Message sent', tier: 'E3', description: 'Channel + recipient' },
  { value: 'metric_snapshot', label: 'Metric snapshot', tier: 'E4', description: 'Name + value' },
  {
    value: 'human_attestation',
    label: 'Human attestation (override)',
    tier: 'E1',
    description: 'Override + approval',
  },
  { value: 'other', label: 'Other (classification debt)', tier: 'E0', description: '⚠ visible debt' },
];

const SOURCE_OPTIONS: ReadonlyArray<EvidenceSourceKind> = [
  'manual',
  'cli',
  'http_callback',
  'connector_sync',
];

export interface GateState {
  ready: boolean;
  reasons: string[];
  validatorVersion: string;
}

export function TaskEvidencePanel({
  taskId,
  initialTokens,
  initialGate,
  taskStatus,
}: {
  taskId: string;
  initialTokens: EvidenceToken[];
  initialGate: GateState;
  taskStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<EvidenceKind>('manual_note');
  const [sourceKind, setSourceKind] = useState<EvidenceSourceKind>('manual');
  const [createdBy, setCreatedBy] = useState('yoni');
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [overrideReason, setOverrideReason] = useState('');
  const [approvedBy, setApprovedBy] = useState('');

  const selected = KIND_OPTIONS.find((k) => k.value === kind)!;

  async function attach() {
    setError(null);
    try {
      const body: Partial<CreateEvidenceTokenInput> = {
        evidenceKind: kind,
        sourceKind,
        createdBy,
        payload: coercePayload(kind, payload),
      };
      if (kind === 'human_attestation') {
        body.overrideReason = overrideReason;
        body.approvedBy = approvedBy;
      }
      const res = await fetch(`/api/tasks/${taskId}/evidence`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; reasons?: string[] };
        throw new Error(
          data.reasons ? `${data.error ?? 'validation failed'}: ${data.reasons.join('; ')}` : data.error ?? `request failed ${res.status}`,
        );
      }
      setPayload({});
      setOverrideReason('');
      setApprovedBy('');
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'attach failed');
    }
  }

  async function markComplete() {
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ completedBy: createdBy }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; reasons?: string[] };
        throw new Error(
          data.reasons ? `${data.error ?? 'gate blocked'}: ${data.reasons.join('; ')}` : data.error ?? `request failed ${res.status}`,
        );
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'complete failed');
    }
  }

  return (
    <div className="space-y-4">
      {/* Gate banner */}
      <GateBanner gate={initialGate} taskStatus={taskStatus} />

      {/* Evidence list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-200">Evidence ({initialTokens.length})</h3>
        {initialTokens.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No evidence attached yet.</p>
        ) : (
          <ul className="space-y-2">
            {initialTokens.map((t) => (
              <li key={t.id} className="border border-slate-800 rounded-md p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-200">{t.evidenceKind}</span>
                  <span className="px-1 rounded bg-slate-800 text-slate-300">{t.tier}</span>
                  <span className="text-slate-500">by {t.createdBy}</span>
                  <span className="text-slate-500">· source: {t.sourceKind}</span>
                  {t.evidenceKind === 'other' && (
                    <span className="ml-auto px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                      ⚠ classification debt
                    </span>
                  )}
                </div>
                {t.evidenceKind === 'other' && (
                  <div className="text-amber-300/80 mt-1">
                    proposed kind: {String((t.payload as { proposedKind?: string }).proposedKind ?? 'none')}
                  </div>
                )}
                <pre className="text-[10px] text-slate-400 mt-2 whitespace-pre-wrap">
                  {JSON.stringify(t.payload, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Attach form */}
      {taskStatus !== 'completed' && (
        <div className="border border-slate-800 rounded-md p-3 space-y-3">
          <h3 className="text-sm font-medium text-slate-200">Attach evidence</h3>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400 space-y-1">
              <span>Kind</span>
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as EvidenceKind);
                  setPayload({});
                }}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} ({o.tier})
                  </option>
                ))}
              </select>
              <span className="text-slate-500 text-[10px] block">{selected.description} · tier {selected.tier}</span>
            </label>

            <label className="text-xs text-slate-400 space-y-1">
              <span>Source</span>
              <select
                value={sourceKind}
                onChange={(e) => setSourceKind(e.target.value as EvidenceSourceKind)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              >
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-400 space-y-1 col-span-2">
              <span>Created by</span>
              <input
                type="text"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                placeholder="ceo / operator / your name"
              />
            </label>
          </div>

          {kind === 'other' && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
              <p className="font-medium">⚠ Classification debt</p>
              <p>
                You are filing an "other" record. Required: <code>description</code> +{' '}
                <code>proposedKind</code> (what should this kind eventually be called).
              </p>
            </div>
          )}

          <PayloadFields kind={kind} payload={payload} onChange={setPayload} />

          {kind === 'human_attestation' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-400 space-y-1">
                <span>Override reason</span>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  placeholder="why no system-of-record exists"
                />
              </label>
              <label className="text-xs text-slate-400 space-y-1">
                <span>Approved by</span>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  placeholder="ceo"
                />
              </label>
            </div>
          )}

          <button
            type="button"
            onClick={attach}
            disabled={pending}
            className="text-xs px-3 py-1 rounded-md border border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
          >
            Attach evidence
          </button>

          {error && <div className="text-[11px] text-rose-300/90">{error}</div>}
        </div>
      )}

      {/* Completion control */}
      {taskStatus !== 'completed' && (
        <div className="border border-slate-800 rounded-md p-3 space-y-2">
          <button
            type="button"
            onClick={markComplete}
            disabled={pending || !initialGate.ready}
            className="text-xs px-3 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark task complete
          </button>
          {!initialGate.ready && (
            <div className="text-[11px] text-amber-300/80">
              Gate blocks completion: {initialGate.reasons.join('; ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GateBanner({ gate, taskStatus }: { gate: GateState; taskStatus: string }) {
  if (taskStatus === 'completed') {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        Task is complete. Evidence is locked for audit.
      </div>
    );
  }
  if (gate.ready) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        Gate: READY — evidence satisfies the task's requirements. You can mark complete.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <p className="font-medium">Gate: BLOCKED</p>
      <ul className="list-disc list-inside text-xs mt-1 space-y-1">
        {gate.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function PayloadFields({
  kind,
  payload,
  onChange,
}: {
  kind: EvidenceKind;
  payload: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const set = (key: string, value: string) => onChange({ ...payload, [key]: value });
  const text = (key: string, label: string, placeholder?: string) => (
    <label key={key} className="text-xs text-slate-400 space-y-1">
      <span>{label}</span>
      <input
        type="text"
        value={payload[key] ?? ''}
        onChange={(e) => set(key, e.target.value)}
        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
        placeholder={placeholder ?? ''}
      />
    </label>
  );
  const fields = (() => {
    switch (kind) {
      case 'manual_note':
        return [text('text', 'Text'), text('author', 'Author', 'who wrote this')];
      case 'screenshot':
        return [
          text('url', 'URL', 'https://...'),
          text('capturedAt', 'Captured at (ISO)', '2026-06-05T12:00:00Z'),
        ];
      case 'meeting_held':
        return [
          text('attendees', 'Attendees (comma-separated)', 'alice, bob'),
          text('durationMinutes', 'Duration minutes', '30'),
          text('heldAt', 'Held at (ISO)', '2026-06-05T10:00:00Z'),
        ];
      case 'document_produced':
        return [
          text('title', 'Title'),
          text('url', 'URL'),
          text('producedAt', 'Produced at (ISO)', '2026-06-05T12:00:00Z'),
        ];
      case 'message_sent':
        return [
          text('channel', 'Channel', 'email'),
          text('recipient', 'Recipient', 'recipients'),
          text('sentAt', 'Sent at (ISO)', '2026-06-05T14:30:00Z'),
        ];
      case 'metric_snapshot':
        return [
          text('metricName', 'Metric name', 'metric_name'),
          text('value', 'Value (number)', '12'),
          text('observedAt', 'Observed at (ISO)', '2026-06-05T09:00:00Z'),
          text('source', 'Source', 'connector:example'),
        ];
      case 'human_attestation':
        return [text('statement', 'Statement', 'I confirm X happened')];
      case 'other':
        return [
          text('description', 'Description (required)', 'what happened'),
          text(
            'proposedKind',
            'Proposed kind (required)',
            'what should this kind eventually be called',
          ),
        ];
    }
  })();
  return <div className="grid grid-cols-2 gap-3">{fields}</div>;
}

/**
 * Coerce raw string form fields into the typed payload shape the API expects
 * (numbers parsed, arrays split). Validation lives at the API/doos-core
 * layer — this just maps form strings to the right primitive types.
 */
function coercePayload(
  kind: EvidenceKind,
  raw: Record<string, string>,
): Record<string, unknown> {
  switch (kind) {
    case 'meeting_held':
      return {
        attendees: (raw.attendees ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        durationMinutes: Number(raw.durationMinutes ?? ''),
        heldAt: raw.heldAt ?? '',
      };
    case 'metric_snapshot':
      return {
        metricName: raw.metricName ?? '',
        value: Number(raw.value ?? ''),
        observedAt: raw.observedAt ?? '',
        source: raw.source ?? '',
      };
    default:
      return { ...raw };
  }
}
