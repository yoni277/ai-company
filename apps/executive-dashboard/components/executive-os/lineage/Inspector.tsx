'use client';

/**
 * D086 Phase 1 (T1.4) — Inspector: URL-addressable lineage detail.
 *
 * Selection lives in the URL (?inspect=<type>:<id>) so it survives refresh and
 * is shareable. Layout (Gemini F4): split view master-detail (~32/68) at ≥lg;
 * slide-over overlay below lg. Selecting another row updates the detail in place
 * (the panel re-fetches; no open/close churn). Hosts the full LineageThread +
 * the REUSED action components (WorkRowActions / CeoReplyBox / DecisionQueueItem)
 * and retains the existing "↗" page link. Read-only assembly; actions are the
 * existing endpoints. When nothing is selected the panel renders nothing — zero
 * layout shift, initial payload unchanged.
 */
import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useTheme } from '../../theme-provider';
import { WorkRowActions } from '../work/WorkRowActions';
import { CeoReplyBox } from '../CeoReplyBox';
import { DecisionQueueItem } from '../DecisionQueueItem';
import { LineageThread } from './LineageThread';
import { useLineage } from './useLineage';
import { L, pick } from './labels';

export interface InspectSelection {
  type: string;
  id: string;
}

/** Parse + mutate the ?inspect=<type>:<id> selection, preserving other params. */
export function useInspect(): {
  selection: InspectSelection | null;
  setInspect: (type: string, id: string) => void;
  clearInspect: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get('inspect');
  let selection: InspectSelection | null = null;
  if (raw) {
    const idx = raw.indexOf(':');
    if (idx > 0) selection = { type: raw.slice(0, idx), id: raw.slice(idx + 1) };
  }

  const setInspect = useCallback(
    (type: string, id: string) => {
      const next = new URLSearchParams(params.toString());
      next.set('inspect', `${type}:${id}`);
      router.replace(`${pathname}?${next.toString()}` as never, { scroll: false });
    },
    [params, pathname, router],
  );
  const clearInspect = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete('inspect');
    const qs = next.toString();
    router.replace((qs ? `${pathname}?${qs}` : pathname) as never, { scroll: false });
  }, [params, pathname, router]);

  return { selection, setInspect, clearInspect };
}

/**
 * Wrap a page's list content. At ≥lg, shrinks the list to the master column and
 * shows the detail beside it when something is selected; below lg the detail is
 * a slide-over. No selection ⇒ children render full-width (no shift).
 */
export function InspectorLayout({ children }: { children: ReactNode }) {
  const { selection } = useInspect();
  const open = Boolean(selection);
  return (
    <div className={open ? 'lg:flex lg:items-start lg:gap-lg' : ''}>
      <div className={open ? 'min-w-0 lg:w-[32%] lg:shrink-0' : ''}>{children}</div>
      {open && selection ? <InspectorPanel selection={selection} /> : null}
    </div>
  );
}

function InspectorPanel({ selection }: { selection: InspectSelection }) {
  const { locale } = useTheme();
  const he = locale === 'he';
  const { clearInspect } = useInspect();
  const { data, loading, error } = useLineage(selection.type, selection.id);

  return (
    <>
      {/* Backdrop — slide-over affordance below lg only. */}
      <div
        onClick={clearInspect}
        className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        aria-hidden="true"
      />
      <aside
        role="complementary"
        aria-label={pick(L.inspector, he)}
        className="fixed inset-inline-end-0 top-0 z-40 h-screen w-[92vw] max-w-[28rem] overflow-y-auto border-s border-outline-variant bg-surface-container-lowest p-lg shadow-ambient lg:static lg:z-auto lg:h-auto lg:max-h-[80vh] lg:w-auto lg:max-w-none lg:flex-1 lg:rounded-lg lg:border"
      >
        <div className="flex items-start gap-sm">
          <h2 className="min-w-0 flex-1 font-headline-md text-headline-md text-on-surface">
            {data ? data.timeline.originTitle : pick(L.inspector, he)}
          </h2>
          <button
            type="button"
            onClick={clearInspect}
            aria-label={pick(L.close, he)}
            className="shrink-0 rounded-md border border-outline-variant px-sm py-xs font-label-md text-label-md text-on-surface-variant hover:bg-surface-container"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="mt-md font-body-md text-body-md text-on-surface-variant">{pick(L.loading, he)}</p>
        ) : error || !data ? (
          <p className="mt-md font-body-md text-body-md text-on-surface-variant">{pick(L.error, he)}</p>
        ) : (
          <div className="mt-md space-y-lg">
            <LineageThread timeline={data.timeline} />

            {/* Reused actions — existing endpoints only. */}
            {data.actions.ceoReply ? (
              <CeoReplyBox
                instructionId={data.actions.ceoReply.instructionId}
                instruction={data.actions.ceoReply.instruction}
                question={data.actions.ceoReply.question}
                he={he}
              />
            ) : null}

            {data.actions.workRows.map((w) => (
              <div key={w.id} className="border-t border-outline-variant pt-sm">
                <WorkRowActions item={w} locale={locale} />
              </div>
            ))}

            {data.actions.decisionQueue.map((q) => (
              <DecisionQueueItem key={`${q.kind}-${q.id}`} item={q} />
            ))}

            {/* Retained page link — optional, never required. */}
            {originHref(data.timeline) ? (
              <Link
                href={originHref(data.timeline)! as never}
                prefetch={false}
                className="inline-block font-label-md text-label-md text-primary hover:underline"
              >
                {pick(L.openPage, he)}
              </Link>
            ) : null}
          </div>
        )}
      </aside>
    </>
  );
}

function originHref(timeline: { stages: { key: string; items: { href?: string | null }[] }[] }): string | null {
  const origin = timeline.stages.find((s) => s.key === 'origin');
  return origin?.items[0]?.href ?? null;
}
