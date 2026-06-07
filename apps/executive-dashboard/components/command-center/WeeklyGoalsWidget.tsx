'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '../Card';

const STORAGE_KEY = 'ai-company-ceo-weekly-goals-v1';

/**
 * Generic weekly-goals checklist. The platform ships with NO hardcoded goals —
 * an instance (or the operator) supplies them via the `goals` prop. Checked
 * state is persisted locally, keyed by goal id.
 */
export interface WeeklyGoal {
  id: string;
  label: string;
}

function loadChecked(ids: string[]): Record<string, boolean> {
  const empty: Record<string, boolean> = {};
  for (const id of ids) empty[id] = false;
  if (typeof window === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    return { ...empty, ...(JSON.parse(raw) as Record<string, boolean>) };
  } catch {
    return empty;
  }
}

export function WeeklyGoalsWidget({ goals = [] }: { goals?: WeeklyGoal[] }) {
  const ids = goals.map((g) => g.id);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const empty: Record<string, boolean> = {};
    for (const id of ids) empty[id] = false;
    return empty;
  });

  useEffect(() => {
    setChecked(loadChecked(ids));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals]);

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const done = goals.filter((g) => checked[g.id]).length;

  return (
    <Card
      title="This week's goals"
      subtitle={
        goals.length === 0
          ? 'No goals set'
          : `${done}/${goals.length} complete · persisted locally`
      }
    >
      {goals.length === 0 ? (
        <p className="text-sm text-slate-500">
          No goals configured. An instance can supply weekly goals for this view.
        </p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <li key={goal.id}>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checked[goal.id] ?? false}
                  onChange={() => toggle(goal.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/40"
                />
                <span
                  className={`text-sm ${
                    checked[goal.id] ? 'text-slate-500 line-through' : 'text-slate-100'
                  } group-hover:text-slate-50`}
                >
                  {goal.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
