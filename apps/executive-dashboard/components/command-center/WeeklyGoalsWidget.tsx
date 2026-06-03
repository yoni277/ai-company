'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '../Card';

const STORAGE_KEY = 'ai-company-ceo-weekly-goals-v1';

const DEFAULT_GOALS = [
  { id: 'activate-trucks', label: 'Activate 3 trucks (FoodTruck-IL)' },
  { id: 'burgerstop-live', label: 'Convert BurgerStop from Mock to Live' },
  { id: 'lab-os-lead', label: 'Create first Lab-OS lead' },
] as const;

type GoalId = (typeof DEFAULT_GOALS)[number]['id'];

function loadChecked(): Record<GoalId, boolean> {
  if (typeof window === 'undefined') {
    return { 'activate-trucks': false, 'burgerstop-live': false, 'lab-os-lead': false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { 'activate-trucks': false, 'burgerstop-live': false, 'lab-os-lead': false };
    return { ...{ 'activate-trucks': false, 'burgerstop-live': false, 'lab-os-lead': false }, ...JSON.parse(raw) };
  } catch {
    return { 'activate-trucks': false, 'burgerstop-live': false, 'lab-os-lead': false };
  }
}

export function WeeklyGoalsWidget() {
  const [checked, setChecked] = useState<Record<GoalId, boolean>>({
    'activate-trucks': false,
    'burgerstop-live': false,
    'lab-os-lead': false,
  });

  useEffect(() => {
    setChecked(loadChecked());
  }, []);

  const toggle = useCallback((id: GoalId) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const done = DEFAULT_GOALS.filter((g) => checked[g.id]).length;

  return (
    <Card
      title="This week's goals"
      subtitle={`${done}/${DEFAULT_GOALS.length} complete · persisted locally`}
    >
      <ul className="space-y-3">
        {DEFAULT_GOALS.map((goal) => (
          <li key={goal.id}>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={checked[goal.id]}
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
    </Card>
  );
}
