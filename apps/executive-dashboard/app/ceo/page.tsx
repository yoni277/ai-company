import { redirect } from 'next/navigation';

/**
 * EPIC-004 (WCC) — the legacy `/ceo` command center is retired. Directive
 * progress now lives as a drill-down inside the Work Control Center (`/work`),
 * in the new design system. This closes L36 (the orphaned /ceo surface).
 * Child routes (e.g. /ceo/directives/[id]) are unaffected — only the root
 * /ceo page redirects.
 */
export default function CeoRedirect() {
  redirect('/work' as never);
}
