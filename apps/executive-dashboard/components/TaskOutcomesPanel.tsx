'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CreateTaskOutcomeInput,
  OutcomeDirection,
  OutcomeSource,
  TaskOutcome,
} from '@ai-company/shared-types';

/**
 * P008 — Task outcomes panel.
 *
 * Chief Architect constraints honored:
 *   - Outcome ≠ Evidence. Distinct UI surface from the evidence panel.
 *   - Measurable only. metricName forced to identifier style by the
 *     validator; UI hint reinforces it.
 *   - Time-bound. Window + observation timestamps required.
 *   - Attached to task only. No "promote to project" affordance.
 *   - AI cannot generate. Manual form only; source enum restricts origin.
 *   - Append-only. No edit / delete buttons by design.
 */

const DIRECTIONS: ReadonlyArray<OutcomeDirection> = ['increase', 'decrease', 'unchanged'];
const SOURCES: ReadonlyArray<OutcomeSource> = [
  'manual',
  'connector_metric',
  'verified_measurement',
];

const DIRECTION_COLOR: Record<OutcomeDirection, string> = {
  increase: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  decrease: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  unchanged: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const DIRECTION_ARROW: Record<OutcomeDirection, string> = {
  increase: '▲',
  decrease: '▼',
  unchanged: '＝',
};

export function TaskOutcomesPanel({
  taskId,
  initialOutcomes,
  taskStatus,
}: {
  taskId: string;
  initialOutcomes: TaskOutcome[];
  taskStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [metricName, setMetricName] = useState('');
  const [metricUnit, setMetricUnit] = useState('count');
  const [baselineValue, setBaselineValue] = useState('');
  const [observedValue, setObservedValue] = useState('');
  const [direction, setDirection] = useState<OutcomeDirection>('increase');
  const [observedAt, setObservedAt] = useState(new Date().toISOString());
  const [windowStart, setWindowStart] = useState(
    new Date(Date.now() - 7 * 86400_000).toISOString(),
  );
  const [windowEnd, setWindowEnd] = useState(new Date().toISOString());
  const [source, setSource] = useState<OutcomeSource>('manual');
  const [sourceRef, setSourceRef] = useState('');
  const [recordedBy, setRecordedBy] = useState('yoni');
  const [notes, setNotes] = useState('');

  async function record() {
    setError(null);
    try {
      const body: Partial<CreateTaskOutcomeInput> = {
        metricName,
        metricUnit: metricUnit || null,
        baselineValue: Number(baselineValue),
        observedValue: Number(observedValue),
        direction,
        observedAt,
        windowStart,
        windowEnd,
        source,
        sourceRef: sourceRef.trim() || null,
        recordedBy,
        notes: notes.trim() || null,
      };
      const res = await fetch(`/api/tasks/${taskId}/outcomes`, {
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
      // Reset form fields, refresh page.
      setMetricName('');
      setBaselineValue('');
      setObservedValue('');
      setSourceRef('');
      setNotes('');
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'record failed');
    }
  }

  const isPreCompletion = taskStatus !== 'completed';

  return (
    <div className="space-y-4">
      {/* Outcomes list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-200">
          Outcomes ({initialOutcomes.length})
        </h3>
        {initialOutcomes.length === 0 ? (
          <p className="text-xs text-slate-500 italic">
            No outcomes recorded yet. Outcomes answer "did the work matter?" — they are
            facts about the world after the task, not commentary about the task.
          </p>
        ) : (
          <ul className="space-y-2">
            {initialOutcomes.map((o) => (
              <li key={o.id} className="border border-slate-800 rounded-md p-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-200">{o.metricName}</span>
                  <span className={`px-2 py-0.5 rounded border ${DIRECTION_COLOR[o.direction]}`}>
                    {DIRECTION_ARROW[o.direction]} {formatDelta(o.delta)} {o.metricUnit ?? ''}
                  </span>
                  <span className="text-slate-500">
                    {o.baselineValue} → {o.observedValue}
                  </span>
                  <span className="ml-auto text-slate-500">
                    source: {o.source}
                    {o.sourceRef && ` (${o.sourceRef})`}
                  </span>
                </div>
                <div className="text-slate-500 mt-1">
                  observed {new Date(o.observedAt).toISOString()} · window {new Date(o.windowStart).toISOString().slice(0, 10)} → {new Date(o.windowEnd).toISOString().slice(0, 10)} · recorded by {o.recordedBy}
                </div>
                {o.notes && (
                  <div className="text-slate-400 mt-1 whitespace-pre-wrap">{o.notes}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Record form */}
      <div className="border border-slate-800 rounded-md p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">Record outcome</h3>
          {isPreCompletion && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              pre-completion baseline OK; flag retained in audit
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400 space-y-1">
            <span>Metric name (identifier style)</span>
            <input
              type="text"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              placeholder="verified_truck_owners"
            />
            <span className="text-[10px] text-slate-500 block">
              regex /^[a-z][a-z0-9_]*$/ — no spaces, no caps
            </span>
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Unit</span>
            <input
              type="text"
              value={metricUnit}
              onChange={(e) => setMetricUnit(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              placeholder="count / ILS / % / minutes"
            />
          </label>

          <label className="text-xs text-slate-400 space-y-1">
            <span>Baseline value (number)</span>
            <input
              type="number"
              step="any"
              value={baselineValue}
              onChange={(e) => setBaselineValue(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Observed value (number)</span>
            <input
              type="number"
              step="any"
              value={observedValue}
              onChange={(e) => setObservedValue(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            />
          </label>

          <label className="text-xs text-slate-400 space-y-1">
            <span>Direction</span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as OutcomeDirection)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            >
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500 block">
              must match the math: increase ⇒ observed &gt; baseline
            </span>
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Source</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as OutcomeSource)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {(source === 'connector_metric' || source === 'verified_measurement') && (
            <label className="text-xs text-slate-400 space-y-1 col-span-2">
              <span>Source ref (required for non-manual sources)</span>
              <input
                type="text"
                value={sourceRef}
                onChange={(e) => setSourceRef(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                placeholder="connector run id / measurement id"
              />
            </label>
          )}

          <label className="text-xs text-slate-400 space-y-1">
            <span>Observed at (ISO)</span>
            <input
              type="text"
              value={observedAt}
              onChange={(e) => setObservedAt(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              placeholder="2026-06-05T22:00:00Z"
            />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Recorded by</span>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              placeholder="ceo / operator / your name"
            />
          </label>

          <label className="text-xs text-slate-400 space-y-1">
            <span>Window start (ISO)</span>
            <input
              type="text"
              value={windowStart}
              onChange={(e) => setWindowStart(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Window end (ISO)</span>
            <input
              type="text"
              value={windowEnd}
              onChange={(e) => setWindowEnd(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            />
          </label>

          <label className="text-xs text-slate-400 space-y-1 col-span-2">
            <span>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 min-h-[60px]"
              placeholder="optional commentary — the truth claim is still the numbers"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={record}
          disabled={pending}
          className="text-xs px-3 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
        >
          Record outcome
        </button>

        {error && <div className="text-[11px] text-rose-300/90">{error}</div>}
      </div>
    </div>
  );
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return String(delta);
  return '0';
}
