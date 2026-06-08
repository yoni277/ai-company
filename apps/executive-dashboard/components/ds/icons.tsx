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
