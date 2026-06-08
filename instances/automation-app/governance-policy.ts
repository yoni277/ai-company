import type { GovernancePolicy } from '@ai-company/shared-types';

/**
 * Instance-supplied governance limits for the automation-app instance.
 * The platform never hardcodes per-company caps — this file is the
 * single source of truth that the dashboard reads through the
 * `@active-instance/governance-policy` alias. See [[D018]] in the tracker.
 */
export const GOVERNANCE_POLICY: GovernancePolicy = {
  maxActiveObjectives: 5,
};
