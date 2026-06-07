/** Standing directive category — free text in DB; common values listed for UI. */
export type CEODirectiveCategory =
  | 'strategy'
  | 'operations'
  | 'finance'
  | 'product'
  | 'people'
  | 'override'
  | string;

export type CEODecisionStatus =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'deferred'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/**
 * Stable identifier for an AI executive. Mirrors the `id` field on each
 * executive (CHIEF_OF_STAFF_ID, CTO_ID, etc.). Kept as a string union so
 * that consumers don't have to import every executive package.
 */
export type ExecutiveId =
  | 'chief-of-staff'
  | 'cto'
  | 'coo'
  | 'cfo'
  | 'vp-marketing'
  | 'vp-sales';

/** CEO standing directive or strategic override. */
export interface CEODirective {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  directive: string;
  category: string;
  priority: string;
  active: boolean;
  expiresAt: string | null;
  isOverride: boolean;
  targetProjectId: string | null;
  /**
   * Which AI executives should produce an ad-hoc response to this directive.
   * Defaulted by category at creation (see defaultRespondingExecutives in
   * the dashboard's lib/ceo-operating-system.ts) but editable per-directive.
   * Empty array means the directive is informational only — no fan-out runs.
   */
  respondingExecutives: ExecutiveId[];
  /**
   * Phase 1B: every directive should trace to an objective. Nullable while
   * pre-DOOS directives are backfilled by the CEO; Phase 2+ may flip to
   * NOT NULL once backfill is complete.
   */
  objectiveId: string | null;
}

/** CEO decision on a recommended action or manual item — no autonomous execution. */
export interface CEODecision {
  id: string;
  createdAt: string;
  sourceActionId: string | null;
  projectId: string | null;
  decisionTitle: string;
  decisionDescription: string | null;
  decisionStatus: CEODecisionStatus;
  owner: string | null;
  dueDate: string | null;
  priority: string;
  notes: string | null;
}

export interface CreateCEODirectiveInput {
  title: string;
  directive: string;
  category: string;
  priority: string;
  active?: boolean;
  expiresAt?: string | null;
  isOverride?: boolean;
  targetProjectId?: string | null;
  /**
   * Optional override of the category-default responding executives.
   * If omitted, the dashboard layer fills this in from category.
   */
  respondingExecutives?: ExecutiveId[];
  /** Phase 1B: link this directive to an objective at creation time. */
  objectiveId?: string | null;
}

/** Partial update applied via PATCH; any omitted field is left unchanged. */
export interface UpdateCEODirectiveInput {
  title?: string;
  directive?: string;
  category?: string;
  priority?: string;
  active?: boolean;
  expiresAt?: string | null;
  targetProjectId?: string | null;
  respondingExecutives?: ExecutiveId[];
  /** Phase 1B: link or relink this directive to a different objective. */
  objectiveId?: string | null;
}

export interface CreateCEODecisionInput {
  sourceActionId?: string | null;
  projectId?: string | null;
  decisionTitle: string;
  decisionDescription?: string | null;
  decisionStatus?: CEODecisionStatus;
  owner?: string | null;
  dueDate?: string | null;
  priority?: string;
  notes?: string | null;
}

export interface UpdateCEODecisionInput {
  decisionStatus?: CEODecisionStatus;
  owner?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  priority?: string;
}
