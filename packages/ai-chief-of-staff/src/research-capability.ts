import type { ResearchCapability } from '@ai-company/shared-types';

/**
 * Generic registry — mirrors DirectiveResponderRegistry (see D011) so
 * every executive that opts into research dispatches by interface, not
 * by vendor. Phase 2A registers exactly one capability under the name
 * `research`. Backend selection lives in the instance layer.
 *
 * Doctrine traceability:
 *   - Capability Abstraction (locked pillar)
 *   - Platform Separation Axiom (locked pillar)
 *   - D022 (Operational Validation Blocker Exception, scoped narrow)
 */

const REGISTRY = new Map<string, ResearchCapability>();

/** Standard well-known capability name executives ask for. */
export const RESEARCH_CAPABILITY = 'research';

export function registerResearchCapability(cap: ResearchCapability): void {
  REGISTRY.set(cap.name, cap);
}

export function getResearchCapability(
  name: string = RESEARCH_CAPABILITY,
): ResearchCapability | undefined {
  return REGISTRY.get(name);
}

export function listResearchCapabilities(): string[] {
  return Array.from(REGISTRY.keys());
}

/** Test-only — wipe the registry. */
export function __resetResearchCapabilities(): void {
  REGISTRY.clear();
}
