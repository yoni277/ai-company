import type { FunnelStage } from './funnel';

/** Registry lifecycle status (configuration, not funnel health). */
export type ProjectStatus = 'active' | 'inactive' | 'archived';

/** Portfolio company definition from the project registry. */
export interface ProjectDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectStatus;
  enabled: boolean;
  sortOrder: number;
}

/** How metrics are collected for a project. */
export interface ProjectConnectorConfig {
  projectId: string;
  projectSlug: string;
  connectorType: string;
  enabled: boolean;
  /** True when env credentials exist for a live connector type. */
  liveCapable: boolean;
  config: Record<string, unknown>;
}

/** Funnel stages and optional mock counts for placeholder connectors. */
export interface ProjectFunnelConfig {
  projectId: string;
  projectSlug: string;
  projectName: string;
  stages: FunnelStage[];
  mockStageCounts: Record<string, number>;
}

/** Fully resolved project ready for portfolio / funnel engines. */
export interface RegisteredProject {
  definition: ProjectDefinition;
  funnel: ProjectFunnelConfig;
  connector: ProjectConnectorConfig;
}

export interface ProjectRegistryValidationIssue {
  code: string;
  message: string;
  projectSlug?: string;
}

export interface ProjectRegistryValidationResult {
  valid: boolean;
  issues: ProjectRegistryValidationIssue[];
}
