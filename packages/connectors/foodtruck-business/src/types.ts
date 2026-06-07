// FoodTruck-specific metric shapes. These live in the connector (instance/
// connector layer), NOT in the generic @ai-company/shared-types package —
// the platform must not carry per-business types. Moved here under P015A
// (2026-06-06) to keep shared-types business-agnostic.

/** FoodTruck-IL truck registry (read-only business connector). */
export interface TruckRegistryMetrics {
  totalRegisteredTrucks: number;
  approvedTrucks: number;
  pendingTrucks: number;
  rejectedTrucks: number;
  activeTrucks: number;
}

/** Owner onboarding funnel (read-only business connector). */
export interface OwnerAcquisitionMetrics {
  registrationsLast30Days: number;
  approvalsLast30Days: number;
  /** Percentage 0–100: active approved trucks / approved trucks. */
  activationRate: number;
}

export interface FoodTruckBusinessMetrics {
  registry: TruckRegistryMetrics;
  acquisition: OwnerAcquisitionMetrics;
  live: boolean;
  /** Last 30d vs prior 30d registrations for onboarding trend copy. */
  registrationTrend: { current: number; previous: number };
}
