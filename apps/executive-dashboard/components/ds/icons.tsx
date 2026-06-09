/**
 * D061 / P056.2 — Design-system icon glyphs.
 *
 * Small, dependency-free inline SVGs. Every glyph is `aria-hidden` — the meaning
 * is always carried by adjacent text, never by the icon alone (WCAG: color +
 * icon + text). The health triad deliberately uses three *distinct shapes*
 * (check / triangle / octagon) so the non-color cue is shape AND text, not color
 * alone (CTO note on P056.2.1).
 *
 * `currentColor` is used for stroke so callers set color via text-* tokens.
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const BASE: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/** Healthy — check inside a circle. */
export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}

/** Needs Attention — triangle with a bang. */
export function TriangleAlertIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M10.3 3.7 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/** Action Required — octagon with a bang (stop-sign silhouette). */
export function OctagonAlertIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M7.9 2.5h8.2L21.5 7.9v8.2L16.1 21.5H7.9L2.5 16.1V7.9Z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

/** Neutral / no-signal — a dash inside a circle (empty-state-valid health). */
export function CircleDashIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12h7" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  );
}

/* --- v2 sidebar / chrome glyphs (P056-v2) --------------------------------- */

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

export function BusinessIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

export function GavelIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="m14 4 6 6M16 2l6 6-3 3-6-6 3-3Z" />
      <path d="m11 7-7 7M2 22h8M4.5 14.5l5 5" />
    </svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M12 3 5 6v5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 15l3-4 3 3 4-6" />
    </svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5M3 18l9 5 9-5" />
    </svg>
  );
}

export function BadgeIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M14 9h4M14 13h4M6 15c.7-1.3 1.8-2 3-2s2.3.7 3 2" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function ChevronEndIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
    </svg>
  );
}
