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

/** CEO standing directive or strategic override. */
export interface CEODirective {
  id: string;
  createdAt: string;
  title: string;
  directive: string;
  category: string;
  priority: string;
  active: boolean;
  expiresAt: string | null;
  isOverride: boolean;
  targetProjectId: string | null;
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
