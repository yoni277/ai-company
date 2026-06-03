'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import type {
  CEODecision,
  CEODecisionStatus,
  CEODirective,
  RecommendedAction,
  UpdateCEODecisionInput,
} from '@ai-company/shared-types';
import { Badge, Card } from '../Card';

const CATEGORIES = ['strategy', 'operations', 'finance', 'product', 'people', 'override'] as const;
const PRIORITIES = ['P1', 'P2', 'P3'] as const;
const PROJECTS = [
  { id: '', label: 'All portfolio' },
  { id: 'foodtruck-il', label: 'FoodTruck-IL' },
  { id: 'lab-os', label: 'Lab-OS' },
  { id: 'inventory-engine', label: 'Inventory Engine' },
  { id: 'burgerstop', label: 'BurgerStop' },
];

const STATUS_COLOR: Record<CEODecisionStatus, string> = {
  proposed: 'bg-slate-500/15 text-slate-300',
  approved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-300',
  deferred: 'bg-amber-500/15 text-amber-300',
  in_progress: 'bg-sky-500/15 text-sky-300',
  completed: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-slate-700 text-slate-400',
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export function CeoOperatingSystemPanels({
  initialDirectives,
  initialDecisions,
  recommendedActions,
}: {
  initialDirectives: CEODirective[];
  initialDecisions: CEODecision[];
  recommendedActions: RecommendedAction[];
}) {
  const router = useRouter();
  const [directives, setDirectives] = useState(initialDirectives);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [directive, setDirective] = useState('');
  const [category, setCategory] = useState<string>('strategy');
  const [priority, setPriority] = useState<string>('P1');
  const [isOverride, setIsOverride] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const decisionByActionId = useMemo(() => {
    const m = new Map<string, CEODecision>();
    for (const d of decisions) {
      if (d.sourceActionId) m.set(d.sourceActionId, d);
    }
    return m;
  }, [decisions]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const submitDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('directive');
    setError(null);
    try {
      const { directive: created } = await parseJson<{ directive: CEODirective }>(
        await fetch('/api/ceo/directives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            directive,
            category,
            priority,
            isOverride,
            targetProjectId: targetProjectId || null,
            expiresAt: expiresAt || null,
          }),
        }),
      );
      setDirectives((prev) => [created, ...prev]);
      setTitle('');
      setDirective('');
      setIsOverride(false);
      setExpiresAt('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save directive');
    } finally {
      setBusy(null);
    }
  };

  const upsertDecision = async (
    action: RecommendedAction,
    status: CEODecisionStatus,
    extra?: UpdateCEODecisionInput,
  ) => {
    setBusy(action.id);
    setError(null);
    try {
      const existing = decisionByActionId.get(action.id);
      if (existing) {
        const { decision } = await parseJson<{ decision: CEODecision }>(
          await fetch(`/api/ceo/decisions/${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              decisionStatus: status,
              ...extra,
            }),
          }),
        );
        setDecisions((prev) => prev.map((d) => (d.id === decision.id ? decision : d)));
      } else {
        const { decision } = await parseJson<{ decision: CEODecision }>(
          await fetch('/api/ceo/decisions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceActionId: action.id,
              projectId: action.projectId,
              decisionTitle: action.title,
              decisionDescription: action.reason,
              decisionStatus: status,
              priority: action.priority,
              ...extra,
            }),
          }),
        );
        setDecisions((prev) => [decision, ...prev]);
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save decision');
    } finally {
      setBusy(null);
    }
  };

  const patchDecision = async (id: string, patch: UpdateCEODecisionInput) => {
    setBusy(id);
    setError(null);
    try {
      const { decision } = await parseJson<{ decision: CEODecision }>(
        await fetch(`/api/ceo/decisions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }),
      );
      setDecisions((prev) => prev.map((d) => (d.id === decision.id ? decision : d)));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update decision');
    } finally {
      setBusy(null);
    }
  };

  const openDecisions = decisions.filter((d) =>
    ['proposed', 'deferred'].includes(d.decisionStatus),
  );
  const approvedDecisions = decisions.filter((d) => d.decisionStatus === 'approved');
  const inProgressDecisions = decisions.filter((d) => d.decisionStatus === 'in_progress');
  const completedDecisions = decisions.filter((d) =>
    ['completed', 'rejected', 'cancelled'].includes(d.decisionStatus),
  );

  const pendingActions = recommendedActions.filter((a) => {
    const d = decisionByActionId.get(a.id);
    return !d || d.decisionStatus === 'proposed' || d.decisionStatus === 'deferred';
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Phase 5C.1 · CEO Operating System</span>
        <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30">
          CEO-in-the-loop · no autonomous execution
        </Badge>
      </div>

      {error ? (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="grid xl:grid-cols-2 gap-6">
        <Card title="CEO directive input" subtitle="Standing instructions and strategic overrides">
          <form onSubmit={submitDirective} className="space-y-3">
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 min-h-[80px]"
              placeholder="Directive text"
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
            >
              {PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={isOverride}
                onChange={(e) => setIsOverride(e.target.checked)}
              />
              Strategic override
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              placeholder="Expires (optional)"
            />
            <button
              type="submit"
              disabled={busy === 'directive'}
              className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-sm font-medium py-2 text-white"
            >
              {busy === 'directive' ? 'Saving…' : 'Save directive'}
            </button>
          </form>
        </Card>

        <Card title="Active directives" subtitle={`${directives.length} active`}>
          {directives.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No active directives.</p>
          ) : (
            <ul className="space-y-4 max-h-[420px] overflow-y-auto">
              {directives.map((d) => (
                <li key={d.id} className="border-b border-slate-800 pb-3 last:border-0">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-100">{d.title}</span>
                    <Badge className="bg-slate-700 text-slate-300">{d.priority}</Badge>
                    <Badge className="bg-slate-700 text-slate-400">{d.category}</Badge>
                    {d.isOverride ? (
                      <Badge className="bg-amber-500/15 text-amber-300">override</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-400">{d.directive}</p>
                  {d.expiresAt ? (
                    <p className="text-xs text-slate-500 mt-1">Expires {d.expiresAt.slice(0, 10)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="CEO decision panel"
        subtitle="Approve, reject, or defer recommended actions — database only"
      >
        {pendingActions.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No pending recommended actions.</p>
        ) : (
          <ul className="space-y-6">
            {pendingActions.map((action) => {
              const decision = decisionByActionId.get(action.id);
              return (
                <ActionDecisionRow
                  key={action.id}
                  action={action}
                  {...(decision ? { decision } : {})}
                  busy={busy === action.id}
                  onApprove={() => upsertDecision(action, 'approved')}
                  onReject={() => upsertDecision(action, 'rejected')}
                  onDefer={() => upsertDecision(action, 'deferred')}
                  onSaveMeta={(owner, dueDate, notes) => {
                    const patch: UpdateCEODecisionInput = {
                      owner: owner || null,
                      dueDate: dueDate || null,
                      notes: notes || null,
                    };
                    if (decision) {
                      void patchDecision(decision.id, patch);
                    } else {
                      void upsertDecision(action, 'proposed', patch);
                    }
                  }}
                  onPatch={(patch) => {
                    if (decision) void patchDecision(decision.id, patch);
                  }}
                />
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Decision tracker" subtitle="Closed-loop status — no external execution">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <TrackerColumn title="Open" items={openDecisions} />
          <TrackerColumn title="Approved" items={approvedDecisions} />
          <TrackerColumn title="In progress" items={inProgressDecisions} />
          <TrackerColumn title="Completed" items={completedDecisions} />
        </div>
      </Card>
    </div>
  );
}

function TrackerColumn({ title, items }: { title: string; items: CEODecision[] }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
      <div className="text-xs font-semibold text-slate-400 uppercase mb-2">
        {title} ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-600">—</p>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id} className="text-xs text-slate-300">
              <Badge className={`${STATUS_COLOR[d.decisionStatus]} mb-1`}>
                {d.decisionStatus}
              </Badge>
              <div className="text-slate-200">{d.decisionTitle}</div>
              {d.owner ? <div className="text-slate-500">Owner: {d.owner}</div> : null}
              {d.dueDate ? <div className="text-slate-500">Due: {d.dueDate}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionDecisionRow({
  action,
  decision,
  busy,
  onApprove,
  onReject,
  onDefer,
  onSaveMeta,
  onPatch,
}: {
  action: RecommendedAction;
  decision?: CEODecision;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDefer: () => void;
  onSaveMeta: (owner: string, dueDate: string, notes: string) => void;
  onPatch: (patch: UpdateCEODecisionInput) => void;
}) {
  const [owner, setOwner] = useState(decision?.owner ?? '');
  const [dueDate, setDueDate] = useState(decision?.dueDate ?? '');
  const [notes, setNotes] = useState(decision?.notes ?? '');

  return (
    <li className="border border-slate-800 rounded-lg p-4">
      <div className="flex flex-wrap gap-2 mb-2">
        <Badge className="bg-slate-700 text-slate-300">{action.priority}</Badge>
        <span className="text-xs text-slate-500">{action.projectName}</span>
        {decision ? (
          <Badge className={STATUS_COLOR[decision.decisionStatus]}>{decision.decisionStatus}</Badge>
        ) : (
          <Badge className="bg-slate-600 text-slate-300">awaiting decision</Badge>
        )}
      </div>
      <div className="text-sm font-medium text-slate-100">{action.title}</div>
      <p className="text-sm text-slate-400 mt-1">{action.reason}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="px-3 py-1.5 rounded-md bg-emerald-600/80 hover:bg-emerald-500 text-xs text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="px-3 py-1.5 rounded-md bg-red-600/80 hover:bg-red-500 text-xs text-white disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDefer}
          className="px-3 py-1.5 rounded-md bg-amber-600/80 hover:bg-amber-500 text-xs text-white disabled:opacity-50"
        >
          Defer
        </button>
        {decision?.decisionStatus === 'approved' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPatch({ decisionStatus: 'in_progress' })}
            className="px-3 py-1.5 rounded-md bg-sky-600/80 hover:bg-sky-500 text-xs text-white disabled:opacity-50"
          >
            Mark in progress
          </button>
        ) : null}
        {decision?.decisionStatus === 'in_progress' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPatch({ decisionStatus: 'completed' })}
            className="px-3 py-1.5 rounded-md bg-slate-600 hover:bg-slate-500 text-xs text-white disabled:opacity-50"
          >
            Complete
          </button>
        ) : null}
      </div>
      <div className="grid sm:grid-cols-3 gap-2 mt-3">
        <input
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
          placeholder="Owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
        <input
          type="date"
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <input
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => onSaveMeta(owner, dueDate, notes)}
        className="mt-2 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50"
      >
        Save owner / due date / notes
      </button>
    </li>
  );
}
