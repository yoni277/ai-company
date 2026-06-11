/**
 * D086 Phase 1 — EN/HE chrome strings for the lineage UI. Same localization unit
 * as components/executive-os/work/labels.ts: bilingual pairs, gated by `he`.
 */
import type { Pair } from '../../../lib/executive-os/communication-timeline-core';

export function pick(p: Pair, he: boolean): string {
  return he ? p.he : p.en;
}

export const L = {
  lineage: { en: 'Lineage', he: 'שרשרת' },
  hide: { en: 'Hide', he: 'הסתר' },
  openInspector: { en: 'Open in Inspector', he: 'פתח במפקח' },
  openPage: { en: 'Open page ↗', he: 'פתח עמוד ↗' },
  close: { en: 'Close', he: 'סגור' },
  showRaw: { en: 'show raw', he: 'הצג גולמי' },
  hideRaw: { en: 'hide raw', he: 'הסתר גולמי' },
  current: { en: 'Current stage', he: 'שלב נוכחי' },
  onTrack: { en: 'On track — nothing broken in this chain.', he: 'תקין — אין שבר בשרשרת זו.' },
  loading: { en: 'Loading lineage…', he: 'טוען שרשרת…' },
  error: { en: 'Could not load lineage.', he: 'טעינת השרשרת נכשלה.' },
  empty: { en: 'No lineage yet.', he: 'אין עדיין שרשרת.' },
  inspector: { en: 'Inspector', he: 'מפקח' },
  evidence: { en: 'evidence', he: 'ראיה' },
  gap: { en: 'BROKEN', he: 'שבור' },
  stage: { en: 'stage', he: 'שלב' },
} as const;

/** Map a lineage stage status to the design-system StatusBadge health token. */
export function stageHealth(
  status: 'present' | 'empty' | 'gap' | 'error' | 'not_applicable',
): 'healthy' | 'attention' | 'action' | 'neutral' {
  switch (status) {
    case 'present':
      return 'healthy';
    case 'gap':
    case 'error':
      return 'action';
    case 'empty':
    case 'not_applicable':
      return 'neutral';
  }
}
