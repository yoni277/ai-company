/** Ordered stage in a business funnel (configuration, not data). */
export interface FunnelStage {
  id: string;
  label: string;
  order: number;
}

/** Count at a single funnel stage. */
export interface FunnelMetric {
  stageId: string;
  count: number;
}

/** Conversion between two adjacent stages. */
export interface FunnelConversion {
  fromStageId: string;
  toStageId: string;
  fromLabel: string;
  toLabel: string;
  /** Percentage 0–100: toCount / fromCount when fromCount > 0. */
  rate: number;
  fromCount: number;
  toCount: number;
}

/** Volume lost between adjacent stages. */
export interface FunnelDropOff {
  fromStageId: string;
  toStageId: string;
  fromLabel: string;
  toLabel: string;
  lostCount: number;
  /** Percentage 0–100 of volume not advancing to the next stage. */
  dropOffRate: number;
}

/** Deterministic funnel health (no LLM). */
export interface FunnelHealth {
  status: 'healthy' | 'warning' | 'critical';
  mainBottleneck: FunnelConversion | null;
  bottlenecks: FunnelConversion[];
  dropOffs: FunnelDropOff[];
}

/** Analyzed funnel for one portfolio company. */
export interface FunnelSnapshot {
  projectId: string;
  projectName: string;
  stages: FunnelStage[];
  metrics: FunnelMetric[];
  conversions: FunnelConversion[];
  health: FunnelHealth;
  capturedAt: string;
}

/** Configuration passed to the funnel engine (stages + project identity). */
export interface FunnelDefinition {
  projectId: string;
  projectName: string;
  stages: FunnelStage[];
}
