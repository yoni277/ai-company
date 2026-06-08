/**
 * D061 / P056.2.2 — ActionButton  [HAVE]
 *
 * The single button primitive for the Executive OS UI. Three variants
 * (DESIGN.md §Components): primary (solid), secondary (outline), ghost (text).
 *
 * Constraints baked in:
 *  - 44px minimum hit area (`min-h-11`) even when the visual is denser — touch
 *    target rule (DESIGN.md §Layout).
 *  - 2px primary-container focus ring is global (globals.css :focus-visible); we
 *    only add `rounded` so the ring traces the button.
 *  - Logical padding (`px-*`) mirrors under RTL with no overrides.
 *  - `busy` shows a spinner + sets aria-busy and disables the control, so the
 *    same component covers the optimistic-action states the cards need.
 *
 * Presentational — forwards native button props (incl. onClick). No hooks, so it
 * stays server-renderable; interaction is the caller's concern.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary border border-primary hover:opacity-90 active:scale-[0.98]',
  secondary:
    'bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low active:scale-[0.98]',
  ghost:
    'bg-transparent text-primary border border-transparent hover:bg-primary/10 active:scale-[0.98]',
};

export function ActionButton({
  children,
  variant = 'primary',
  busy = false,
  startIcon,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: {
  variant?: ButtonVariant;
  busy?: boolean;
  startIcon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={`inline-flex min-h-11 items-center justify-center gap-sm rounded px-md py-sm font-label-md text-label-md transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {busy ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        startIcon
      )}
      <span>{children}</span>
    </button>
  );
}
