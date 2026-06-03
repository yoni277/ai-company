import type { ReactNode } from 'react';

/** Goals + scorecard row wrapper — added in sprint commit 3. */
export function CommandCenterGoalsRow({ children }: { children: ReactNode }) {
  return <div className="grid lg:grid-cols-2 gap-6">{children}</div>;
}
