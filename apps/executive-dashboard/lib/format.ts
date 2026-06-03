import type { ProjectHealth, RiskSeverity, OpportunityPriority } from '@ai-company/shared-types';

export const HEALTH_COLOR: Record<ProjectHealth, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  at_risk: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  critical: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  paused: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  archived: 'bg-slate-700/30 text-slate-400 border-slate-600/30',
};

export const HEALTH_LABEL: Record<ProjectHealth, string> = {
  healthy: 'Healthy',
  at_risk: 'At risk',
  critical: 'Critical',
  paused: 'Paused',
  archived: 'Archived',
};

export const SEVERITY_COLOR: Record<RiskSeverity, string> = {
  low: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  high: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  critical: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export const PRIORITY_COLOR: Record<OpportunityPriority, string> = {
  low: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  medium: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  high: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

export function formatMetric(value: number, unit?: string): string {
  if (unit === 'ratio') return `${(value * 100).toFixed(1)}%`;
  if (unit === 'USD' || unit === 'ILS') return `${value.toLocaleString()} ${unit}`;
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
