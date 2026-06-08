/**
 * D061 / P056.2.1 — StatusBadge  [DERIVED]
 *
 * The health triad as a single accessible primitive. Per the locked contract
 * (05-data-mapping-confirmed.md §2) the funnel engine emits
 * `'healthy' | 'warning' | 'critical' | null`; this badge maps that to the
 * three executive-reporting states plus a neutral "no signal" so zero-data
 * projects render cleanly (empty-state-is-valid doctrine).
 *
 * WCAG posture (CTO note): each state is distinguished by THREE redundant cues —
 *   shape (check / triangle / octagon / dash) + color token + text label —
 * never color alone. Colors are the DESIGN.md health tokens (emerald/amber/red),
 * all > 4.5:1 against the badge's tinted surface.
 *
 * Presentational only — no hooks, server-renderable.
 */

import type { ComponentType } from 'react';
import type { FunnelHealth } from '@ai-company/shared-types';
import {
  CheckCircleIcon,
  TriangleAlertIcon,
  OctagonAlertIcon,
  CircleDashIcon,
} from './icons';

export type HealthState = 'healthy' | 'attention' | 'action' | 'neutral';

/** Map the funnel engine's status (nullable) to a UI health state. */
export function healthStateFromFunnel(
  status: FunnelHealth['status'] | null | undefined,
): HealthState {
  switch (status) {
    case 'healthy':
      return 'healthy';
    case 'warning':
      return 'attention';
    case 'critical':
      return 'action';
    default:
      return 'neutral';
  }
}

interface StateSpec {
  Icon: ComponentType<{ className?: string; title?: string }>;
  defaultLabel: string;
  // Token-driven classes (text + tinted surface + hairline border). Kept as
  // static literals so Tailwind's source scanner picks them up.
  text: string;
  surface: string;
  border: string;
}

const SPEC: Record<HealthState, StateSpec> = {
  healthy: {
    Icon: CheckCircleIcon,
    defaultLabel: 'Healthy',
    text: 'text-healthy',
    surface: 'bg-healthy/10',
    border: 'border-healthy/30',
  },
  attention: {
    Icon: TriangleAlertIcon,
    defaultLabel: 'Needs Attention',
    text: 'text-attention',
    surface: 'bg-attention/10',
    border: 'border-attention/30',
  },
  action: {
    Icon: OctagonAlertIcon,
    defaultLabel: 'Action Required',
    text: 'text-action',
    surface: 'bg-action/10',
    border: 'border-action/30',
  },
  neutral: {
    Icon: CircleDashIcon,
    defaultLabel: 'No signal',
    text: 'text-outline',
    surface: 'bg-surface-container',
    border: 'border-outline-variant',
  },
};

export function StatusBadge({
  state,
  label,
  size = 'md',
  className = '',
}: {
  state: HealthState;
  /** Override the default state label (e.g. "Healthy: System Core"). */
  label?: string | undefined;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const spec = SPEC[state];
  const text = label ?? spec.defaultLabel;
  const pad = size === 'sm' ? 'px-sm py-[2px]' : 'px-sm py-xs';
  const glyph = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const type = size === 'sm' ? 'text-label-sm font-label-sm' : 'text-label-md font-label-md';
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-full border ${spec.surface} ${spec.border} ${spec.text} ${pad} ${type} ${className}`}
    >
      <spec.Icon className={`${glyph} shrink-0`} />
      <span>{text}</span>
    </span>
  );
}

/**
 * DESIGN.md §Components — data-provenance "micro-tag" (JetBrains Mono).
 * Co-located with StatusBadge because both are the system's labelled chips.
 */
export type DataProvenance = 'HAVE' | 'DERIVED' | 'NEW FIELD' | 'NEW SERVICE';

const DATA_SPEC: Record<DataProvenance, string> = {
  HAVE: 'bg-primary-container/15 text-primary border-primary/30',
  DERIVED: 'bg-secondary-container/40 text-secondary border-secondary/30',
  'NEW FIELD': 'bg-tertiary-container/15 text-tertiary border-tertiary/30',
  'NEW SERVICE': 'bg-error-container text-on-error-container border-error/30',
};

export function DataTag({ kind, className = '' }: { kind: DataProvenance; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-sm py-[2px] font-label-sm text-label-sm uppercase ${DATA_SPEC[kind]} ${className}`}
    >
      DATA: {kind}
    </span>
  );
}
