export interface ProjectMetric {
  id: string;
  projectId: string;
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
}

/** Metric a connector emits before persistence. */
export interface MetricInput {
  name: string;
  value: number;
  unit?: string;
  timestamp?: string;
}
