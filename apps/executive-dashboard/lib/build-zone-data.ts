/**
 * D061 / D065 · P056-v2 step 7 — Build-zone static source.
 *
 * Platform Backlog L-rows and Role Charters per v2-DATA-MAPPING.md:
 *  - Platform Backlog L-items = "static/imported" (DERIVED) from the platform
 *    Refactor-Leaks tracker. The live health index is a NEW-SVC (not wired) —
 *    the page stubs it honestly rather than computing a fake status.
 *  - Role Charters = NEW-FIELD (mandates are not stored today). These are the
 *    platform's standard, business-agnostic role definitions, tagged honestly.
 *
 * No business specifics (cloneability): only platform workstreams + generic
 * executive roles.
 */

export type BacklogCategory = 'Architecture' | 'Cloneability' | 'Governance' | 'Tech Debt';
export type BacklogStatus = 'Active' | 'Watchlist';

export interface BacklogRow {
  id: string;
  title: string;
  category: BacklogCategory;
  status: BacklogStatus;
  note: string;
}

/**
 * Representative L-series rows imported from the Refactor-Leaks tracker
 * (Cowork's master tracker is the source of truth; this is a static snapshot).
 */
export const PLATFORM_BACKLOG: BacklogRow[] = [
  {
    id: 'L18',
    title: 'Registry vs legacy Projects split',
    category: 'Architecture',
    status: 'Active',
    note: 'Decouple surfaces from the legacy projects table; legacy /projects retired in P056-v2.',
  },
  {
    id: 'L25',
    title: 'CEO Operating Model UI redesign',
    category: 'Cloneability',
    status: 'Active',
    note: 'The v2 Executive OS UI (this redesign).',
  },
  {
    id: 'L26',
    title: 'Multi-workstream collision prevention',
    category: 'Governance',
    status: 'Watchlist',
    note: 'Concurrency guards for parallel Builder / Cowork work.',
  },
  {
    id: 'L24',
    title: 'Executive Deliverable Compiler',
    category: 'Tech Debt',
    status: 'Watchlist',
    note: 'Consolidate legacy export engines into unified AI exports.',
  },
  {
    id: 'L22',
    title: 'Executive Role Charters',
    category: 'Governance',
    status: 'Watchlist',
    note: 'Standardize executive responsibilities (see Role Charters).',
  },
  {
    id: 'L23',
    title: 'Executive fan-out resilience',
    category: 'Architecture',
    status: 'Watchlist',
    note: 'No single point of failure in the directive fan-out chain.',
  },
];

export interface RoleCharter {
  role: string;
  mandate: string;
  responsibilities: string[];
  authority: string[];
}

/** Static, business-agnostic role definitions (NEW-FIELD — not stored today). */
export const ROLE_CHARTERS: RoleCharter[] = [
  {
    role: 'Chief of Staff',
    mandate: "Owns the CEO's operating cadence — turns the whole company into decisions, briefings, and follow-through.",
    responsibilities: ['Daily briefing synthesis', 'Decision-queue triage', 'Cross-executive coordination', 'Directive fan-out'],
    authority: ['Set the daily agenda', 'Escalate decisions to the CEO', 'Sequence executive work'],
  },
  {
    role: 'CTO',
    mandate: 'Owns technical feasibility, architecture, and engineering risk.',
    responsibilities: ['Architecture & build quality', 'Technical risk assessment', 'Platform cloneability / boundary'],
    authority: ['Scope and approve technical work', 'Gate releases on quality', 'Rule on architecture'],
  },
  {
    role: 'COO',
    mandate: 'Owns operations, execution, and delivery.',
    responsibilities: ['Operational throughput', 'Bottleneck detection', 'Delivery tracking'],
    authority: ['Prioritize execution', 'Flag operational risk'],
  },
  {
    role: 'CFO',
    mandate: 'Owns financial modeling, ROI, and capital discipline.',
    responsibilities: ['ROI modeling', 'Capital-allocation guidance', 'Financial risk'],
    authority: ['Advise capital reallocation', 'Gate spend'],
  },
  {
    role: 'VP Marketing',
    mandate: 'Owns demand generation and the marketing channels.',
    responsibilities: ['Channel strategy', 'Campaign & asset production', 'Top-of-funnel pipeline'],
    authority: ['Allocate marketing effort', 'Recommend channel investment'],
  },
  {
    role: 'VP Sales',
    mandate: 'Owns revenue conversion and the sales funnel.',
    responsibilities: ['Pipeline conversion', 'Sales-channel performance'],
    authority: ['Prioritize deals', 'Flag conversion risk'],
  },
];
