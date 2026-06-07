export interface ProjectMetric {
  id: string;
  projectId: string;
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
  /**
   * P006A — provenance: who recorded this metric. Required at v2. Pre-P006A
   * rows backfilled with 'pre-p006a' so the value itself is audit information.
   */
  recordedBy: string;
}

/** Metric a connector emits before persistence. */
export interface MetricInput {
  name: string;
  value: number;
  unit?: string;
  timestamp?: string;
}
