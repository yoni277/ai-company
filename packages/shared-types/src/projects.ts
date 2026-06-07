export type ProjectHealth = 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectHealth;
  createdAt: string;
  updatedAt: string;
  /**
   * P006 — provenance of this project row. Required, non-empty, and ideally
   * a known actor id ('ceo', 'operator', 'migration', or a specific user id).
   * Pre-P006 rows are stamped 'pre-p006' so the value itself is audit
   * information: did this row exist before governance was enforced, or was
   * it created under the new regime?
   */
  createdBy: string;
}

/**
 * P006 — registration input. The single insert path for projects. Connectors
 * are no longer permitted to create rows; they can only update existing ones.
 */
export interface CreateProjectInput {
  slug: string;
  name: string;
  description: string;
  status: ProjectHealth;
  createdBy: string;
}

/**
 * P006 — partial update for an existing project. SyncOrchestrator uses this
 * to refresh name/description/status from connector status reports.
 */
export interface UpdateProjectBySlugInput {
  name?: string;
  description?: string;
  status?: ProjectHealth;
}

export interface ProjectStatusSnapshot {
  health: ProjectHealth;
  headline: string;
  detail?: string;
  asOf: string;
}
