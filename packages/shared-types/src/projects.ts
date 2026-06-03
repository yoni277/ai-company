export type ProjectHealth = 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectHealth;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStatusSnapshot {
  health: ProjectHealth;
  headline: string;
  detail?: string;
  asOf: string;
}
