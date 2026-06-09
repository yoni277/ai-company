/**
 * EPIC-004 (WCC) — shared EN/HE labels + state metadata for the /work surface.
 * Generic/cloneable: zero business specifics; roles are the fixed platform set.
 */
import type { WorkState } from '../../../lib/executive-os/work-state';
import type { HealthState } from '../../ds/StatusBadge';

export type Locale = 'en' | 'he';

export interface StateMeta {
  en: string;
  he: string;
  health: HealthState; // color+icon+text redundancy (WCAG)
  attention: boolean;
}

/** Display order: attention states first, then active, then terminal. */
export const STATE_ORDER: readonly WorkState[] = [
  'needs_ceo_completion',
  'awaiting_approval',
  'awaiting_ceo_input',
  'blocked',
  'overdue',
  'in_progress',
  'open',
  'done',
  'cancelled',
  'rejected',
];

export const STATE_META: Record<WorkState, StateMeta> = {
  needs_ceo_completion: { en: 'Needs CEO Completion', he: 'דרושה השלמת מנכ״ל', health: 'action', attention: true },
  awaiting_approval: { en: 'Awaiting Approval', he: 'ממתין לאישור', health: 'attention', attention: true },
  awaiting_ceo_input: { en: 'Awaiting CEO Input', he: 'ממתין לקלט מנכ״ל', health: 'attention', attention: true },
  blocked: { en: 'Blocked', he: 'חסום', health: 'action', attention: true },
  overdue: { en: 'Overdue', he: 'באיחור', health: 'action', attention: true },
  in_progress: { en: 'In Progress', he: 'בתהליך', health: 'neutral', attention: false },
  open: { en: 'Open', he: 'פתוח', health: 'neutral', attention: false },
  done: { en: 'Done', he: 'הושלם', health: 'healthy', attention: false },
  cancelled: { en: 'Cancelled', he: 'בוטל', health: 'neutral', attention: false },
  rejected: { en: 'Rejected', he: 'נדחה', health: 'neutral', attention: false },
};

export const SOURCE_LABEL: Record<string, { en: string; he: string }> = {
  directive: { en: 'Directive', he: 'הנחיה' },
  meeting: { en: 'Meeting', he: 'ישיבה' },
  instruction: { en: 'Instruction', he: 'הוראה' },
};

/** The fixed platform executive set (cloneable — generic roles, not businesses). */
export const EXECUTIVES: ReadonlyArray<{ id: string; en: string; he: string }> = [
  { id: 'chief-of-staff', en: 'Chief of Staff', he: 'ראש הסגל' },
  { id: 'cto', en: 'CTO', he: 'סמנכ״ל טכנולוגיות' },
  { id: 'coo', en: 'COO', he: 'סמנכ״ל תפעול' },
  { id: 'cfo', en: 'CFO', he: 'סמנכ״ל כספים' },
  { id: 'vp-marketing', en: 'VP Marketing', he: 'סמנכ״ל שיווק' },
  { id: 'vp-sales', en: 'VP Sales', he: 'סמנכ״ל מכירות' },
];

export function execLabel(id: string | null, he: boolean): string {
  if (!id) return he ? 'ללא בעלים' : 'Unassigned';
  const e = EXECUTIVES.find((x) => x.id === id);
  return e ? (he ? e.he : e.en) : id;
}

/** Static UI strings (page chrome, columns, actions, filters). */
export const T = {
  title: { en: 'Work Control Center', he: 'מרכז בקרת עבודה' },
  subtitle: {
    en: 'Every work item — who owns it, what is due, what is blocked, what needs you.',
    he: 'כל פריט עבודה — מי הבעלים, מה היעד, מה חסום, ומה דורש אותך.',
  },
  attentionTitle: { en: 'What needs me', he: 'מה דורש אותי' },
  attentionEmpty: { en: 'Nothing needs you right now. Inbox zero.', he: 'שום דבר לא דורש אותך כעת.' },
  masterTitle: { en: 'All work', he: 'כל העבודה' },
  masterEmpty: { en: 'No work yet. A directive, meeting, or instruction will populate this.', he: 'אין עדיין עבודה.' },
  col: {
    title: { en: 'Title', he: 'כותרת' },
    business: { en: 'Business', he: 'עסק' },
    owner: { en: 'Owner', he: 'בעלים' },
    source: { en: 'Source', he: 'מקור' },
    approval: { en: 'Approval', he: 'אישור' },
    execution: { en: 'Execution', he: 'ביצוע' },
    priority: { en: 'Priority', he: 'עדיפות' },
    due: { en: 'Due / Review', he: 'יעד / סקירה' },
    age: { en: 'Age', he: 'גיל' },
    daysInState: { en: 'Days in state', he: 'ימים במצב' },
    action: { en: 'Action', he: 'פעולה' },
  },
  act: {
    approve: { en: 'Approve', he: 'אישור' },
    reject: { en: 'Reject', he: 'דחייה' },
    save: { en: 'Save', he: 'שמירה' },
    start: { en: 'Start', he: 'התחלה' },
    block: { en: 'Block', he: 'חסימה' },
    unblock: { en: 'Unblock', he: 'שחרור' },
    done: { en: 'Mark done', he: 'סימון הושלם' },
    owner: { en: 'Owner', he: 'בעלים' },
    dueDate: { en: 'Due date', he: 'תאריך יעד' },
    answerInSource: { en: 'Answer in source', he: 'מענה במקור' },
  },
  filter: {
    business: { en: 'Business', he: 'עסק' },
    executive: { en: 'Executive', he: 'מנהל' },
    source: { en: 'Source', he: 'מקור' },
    priority: { en: 'Priority', he: 'עדיפות' },
    status: { en: 'Status', he: 'מצב' },
    waitingOnCeo: { en: 'Waiting on me', he: 'ממתין לי' },
    blocked: { en: 'Blocked', he: 'חסום' },
    all: { en: 'All', he: 'הכול' },
    clear: { en: 'Clear filters', he: 'ניקוי' },
    dueBefore: { en: 'Due before', he: 'יעד לפני' },
  },
  days: { en: 'd', he: 'ימ׳' },
  none: { en: '—', he: '—' },
} as const;

export function tx(pair: { en: string; he: string }, he: boolean): string {
  return he ? pair.he : pair.en;
}
