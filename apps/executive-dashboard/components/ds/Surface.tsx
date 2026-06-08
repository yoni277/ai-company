/**
 * D061 / P056.2 — Card surface shell.
 *
 * DESIGN.md §Elevation: white surface layer, 1px low-contrast outline, 8px
 * radius (cards), no shadow unless hovered. Tonal layers over heavy shadow.
 * Shared by every card primitive so the chrome is defined once.
 */

import type { ReactNode } from 'react';

export function Surface({
  children,
  as: Tag = 'div',
  interactive = false,
  className = '',
}: {
  children: ReactNode;
  as?: 'div' | 'article' | 'section';
  /** Add the hover elevation (DESIGN.md: shadow only on hover). */
  interactive?: boolean;
  className?: string;
}) {
  return (
    <Tag
      className={`rounded-lg border border-outline-variant bg-surface-container-lowest p-lg ${
        interactive ? 'transition hover:shadow-ambient' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
