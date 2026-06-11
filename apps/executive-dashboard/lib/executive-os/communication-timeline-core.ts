/**
 * D086 Phase 1 (T1.1) — Communication Timeline, PURE core.
 *
 * The OF-012 "observe layer": given the already-fetched rows of a communication's
 * lineage chain, classify each stage and detect broken conversions explicitly
 * ("expected ≥1, found 0"). No IO, no 'server-only' — unit-testable in isolation
 * and importable by node:test. The thin read wrapper (communication-timeline.ts)
 * fetches the rows from existing tables and calls buildTimeline().
 *
 * Generic by construction (CA binding constraint #2): stages are named for the
 * communication lifecycle, never per-page or Work-specific. Works for any source
 * type (directive / instruction / meeting / decision / work).
 *
 * Cloneable: zero business specifics.
 */

export type TimelineSourceType =
  | 'directive'
  | 'instruction'
  | 'meeting'
  | 'decision'
  | 'work';

/** Generic communication-lifecycle stages, in canonical order. */
export type LineageStageKey =
  | 'origin'
  | 'responses'
  | 'reports'
  | 'proposals'
  | 'work'
  | 'decisions'
  | 'tasks';

export const LINEAGE_STAGE_ORDER: readonly LineageStageKey[] = [
  'origin',
  'responses',
  'reports',
  'proposals',
  'work',
  'decisions',
  'tasks',
] as const;

export type LineageStageStatus =
  | 'present' // ≥1 item
  | 'empty' // 0 items, but upstream produced nothing either — benign
  | 'gap' // 0 items, but an upstream stage produced output that should have flowed — BROKEN
  | 'error' // ≥1 item carries an error status (e.g. an errored responder)
  | 'not_applicable'; // this stage does not exist for this source type

/** A bilingual string pair — the repo's established localization unit. */
export interface Pair {
  en: string;
  he: string;
}

/**
 * One evidence-linkable item in a stage. `href` is an EXISTING page link (the
 * "↗" affordance / evidence chip); the timeline never invents routes.
 */
export interface LineageItem {
  id: string;
  title: string;
  subtitle?: string | null;
  who?: string | null; // actor label (executive id, "You", etc.)
  when?: string | null; // ISO timestamp
  status?: string | null; // raw status token (e.g. 'done' | 'error' | 'proposed')
  href?: string | null; // existing page link for the evidence chip
}

/** Normalized input the wrapper assembles from existing tables. */
export interface TimelineRaw {
  sourceType: TimelineSourceType;
  sourceId: string;
  origin: LineageItem;
  responses?: LineageItem[];
  reports?: LineageItem[];
  proposals?: LineageItem[];
  work?: LineageItem[];
  decisions?: LineageItem[];
  tasks?: LineageItem[];
  /** Stages that do not apply to this source type (e.g. responses for a meeting). */
  notApplicable?: readonly LineageStageKey[];
}

export interface LineageStage {
  key: LineageStageKey;
  label: Pair;
  items: LineageItem[];
  count: number;
  status: LineageStageStatus;
  /** Set on a `gap`: the minimum expected count (always 1 in Phase 1). */
  expected?: number;
  /** Per-stage statement: the gap text, or the error text. null when nothing to say. */
  note?: Pair | null;
}

export interface CommunicationTimeline {
  sourceType: TimelineSourceType;
  sourceId: string;
  originTitle: string;
  stages: LineageStage[];
  /** Furthest stage reached, or the gap stage when the chain is broken. */
  currentStageKey: LineageStageKey;
  /** True when any applicable stage is a broken conversion. */
  hasGap: boolean;
  /**
   * One-line synthesis for the expanded row (e.g. "3 reports · 0 proposals —
   * stalled 6d"). null on trivial/binary rows where synthesis adds no meaning
   * (Gemini F5). Only produced for a real gap.
   */
  bottleneck: Pair | null;
  /** Whole days the chain has sat at its furthest-reached stage. null if undated. */
  stalledDays: number | null;
}

export const STAGE_LABELS: Record<LineageStageKey, Pair> = {
  origin: { en: 'Origin', he: 'מקור' },
  responses: { en: 'Responses', he: 'תגובות' },
  reports: { en: 'Reports', he: 'דוחות' },
  proposals: { en: 'Proposals', he: 'הצעות' },
  work: { en: 'Work', he: 'עבודה' },
  decisions: { en: 'Decisions', he: 'החלטות' },
  tasks: { en: 'Tasks', he: 'משימות' },
};

/**
 * Conversion edges: a stage with 0 items is a GAP (broken conversion) when its
 * designated upstream stage is applicable AND produced ≥1 item. Stages absent
 * here (decisions, tasks) are optional/terminal — empty is never a gap for them.
 */
const GAP_UPSTREAM: Partial<Record<LineageStageKey, LineageStageKey>> = {
  reports: 'responses',
  proposals: 'reports',
  work: 'proposals',
};

const DAY_MS = 86_400_000;

function wholeDaysBetween(fromISO: string, toISO: string): number | null {
  const from = Date.parse(fromISO);
  const to = Date.parse(toISO);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.max(0, Math.floor((to - from) / DAY_MS));
}

/** Latest (max) `when` across a stage's items, or null. */
function latestWhen(items: LineageItem[]): string | null {
  let max: number | null = null;
  let iso: string | null = null;
  for (const it of items) {
    if (!it.when) continue;
    const t = Date.parse(it.when);
    if (Number.isNaN(t)) continue;
    if (max === null || t > max) {
      max = t;
      iso = it.when;
    }
  }
  return iso;
}

function stageItems(raw: TimelineRaw, key: LineageStageKey): LineageItem[] {
  switch (key) {
    case 'origin':
      return [raw.origin];
    case 'responses':
      return raw.responses ?? [];
    case 'reports':
      return raw.reports ?? [];
    case 'proposals':
      return raw.proposals ?? [];
    case 'work':
      return raw.work ?? [];
    case 'decisions':
      return raw.decisions ?? [];
    case 'tasks':
      return raw.tasks ?? [];
  }
}

/** EN/HE count fragment, e.g. "3 reports" / "3 דוחות". */
function countFragment(n: number, key: LineageStageKey): Pair {
  const label = STAGE_LABELS[key];
  return {
    en: `${n} ${label.en.toLowerCase()}`,
    he: `${n} ${label.he}`,
  };
}

function gapNote(upstreamCount: number, upstreamKey: LineageStageKey): Pair {
  const up = countFragment(upstreamCount, upstreamKey);
  return {
    en: `expected ≥1, found 0 (${up.en} upstream)`,
    he: `צפוי ≥1, נמצאו 0 (${up.he} במעלה השרשרת)`,
  };
}

/**
 * Build the classified timeline from already-fetched rows. Pure: pass `nowISO`
 * for deterministic aging in tests. Never throws.
 */
export function buildTimeline(raw: TimelineRaw, nowISO: string): CommunicationTimeline {
  const na = new Set<LineageStageKey>(raw.notApplicable ?? []);
  const stages: LineageStage[] = [];

  // First pass: counts + applicability + error flags.
  const counts: Record<LineageStageKey, number> = {
    origin: 1,
    responses: 0,
    reports: 0,
    proposals: 0,
    work: 0,
    decisions: 0,
    tasks: 0,
  };
  for (const key of LINEAGE_STAGE_ORDER) {
    if (key === 'origin') continue;
    if (na.has(key)) continue;
    counts[key] = stageItems(raw, key).length;
  }

  let hasGap = false;
  let gapStageKey: LineageStageKey | null = null;
  let lastPresentKey: LineageStageKey = 'origin';
  let lastPresentWhen: string | null = raw.origin.when ?? null;

  for (const key of LINEAGE_STAGE_ORDER) {
    const items = stageItems(raw, key);
    const count = items.length;

    if (na.has(key)) {
      stages.push({
        key,
        label: STAGE_LABELS[key],
        items: [],
        count: 0,
        status: 'not_applicable',
        note: null,
      });
      continue;
    }

    if (key === 'origin') {
      stages.push({
        key,
        label: STAGE_LABELS[key],
        items,
        count,
        status: 'present',
        note: null,
      });
      continue;
    }

    const hasError = items.some((i) => i.status === 'error');

    if (count > 0) {
      lastPresentKey = key;
      const w = latestWhen(items);
      if (w) lastPresentWhen = w;
      stages.push({
        key,
        label: STAGE_LABELS[key],
        items,
        count,
        status: hasError ? 'error' : 'present',
        note: hasError
          ? { en: 'one or more responders errored', he: 'אחת או יותר מהתגובות נכשלה' }
          : null,
      });
      continue;
    }

    // count === 0 — gap or benign empty?
    const upstreamKey = GAP_UPSTREAM[key];
    const upstreamApplicable = upstreamKey ? !na.has(upstreamKey) : false;
    const upstreamCount = upstreamKey ? counts[upstreamKey] : 0;
    const isGap = Boolean(upstreamKey && upstreamApplicable && upstreamCount > 0);

    if (isGap) {
      hasGap = true;
      if (!gapStageKey) gapStageKey = key;
      stages.push({
        key,
        label: STAGE_LABELS[key],
        items: [],
        count: 0,
        status: 'gap',
        expected: 1,
        note: gapNote(upstreamCount, upstreamKey!),
      });
    } else {
      stages.push({
        key,
        label: STAGE_LABELS[key],
        items: [],
        count: 0,
        status: 'empty',
        note: null,
      });
    }
  }

  const currentStageKey = gapStageKey ?? lastPresentKey;
  const stalledDays = lastPresentWhen ? wholeDaysBetween(lastPresentWhen, nowISO) : null;

  // Bottleneck synthesis: ONLY for a real gap (Gemini F5 — no synthesis on
  // trivial/binary rows). States the break with the upstream count + aging.
  let bottleneck: Pair | null = null;
  if (gapStageKey) {
    const upstreamKey = GAP_UPSTREAM[gapStageKey]!;
    const up = countFragment(counts[upstreamKey], upstreamKey);
    const zero = countFragment(0, gapStageKey);
    const daysEn = stalledDays !== null ? ` — stalled ${stalledDays}d` : '';
    const daysHe = stalledDays !== null ? ` — תקוע ${stalledDays} ימ׳` : '';
    bottleneck = {
      en: `${up.en} · ${zero.en}${daysEn}`,
      he: `${up.he} · ${zero.he}${daysHe}`,
    };
  }

  return {
    sourceType: raw.sourceType,
    sourceId: raw.sourceId,
    originTitle: raw.origin.title,
    stages,
    currentStageKey,
    hasGap,
    bottleneck,
    stalledDays,
  };
}
