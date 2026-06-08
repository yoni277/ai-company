import 'server-only';

/**
 * Per-instance connector-type resolver registration. This is the instance/
 * composition seam that teaches the GENERIC portfolio-intelligence + revenue
 * registries how to serve this company's connector types. The generic packages
 * never name a connector — they ask the registry, which the instance populates
 * here.
 *
 * automation-app is PRE-PRODUCT and registers NO business resolver. Its single
 * project uses the `marketplace-prelaunch` connector type, which intentionally
 * has no resolver — so connector-portfolio-intelligence and connector-revenue
 * fall back to their proven generic mock path (mock funnel bundle +
 * MockRevenueConnector). The export stays present so platform.ts resolves the
 * `@active-instance/instance-resolvers` alias; it is simply a no-op today.
 *
 * To activate a live connector type later: import its resolver factories from
 * the generic registries and register them inside `registerInstanceResolvers`.
 *
 * See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md (P015B).
 */

let registered = false;

/**
 * Register this instance's concrete connector-type resolvers into the generic
 * portfolio-intelligence + revenue registries. Invoked once at platform
 * composition time (lib/platform.ts), before any portfolio/revenue load.
 * No-op for the pre-product automation-app instance.
 */
export function registerInstanceResolvers(): void {
  if (registered) return;
  registered = true;
  // Intentionally empty: pre-product instance relies on the generic mock
  // fallback. No business resolver is registered.
}
