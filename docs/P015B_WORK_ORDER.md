# P015B — Remove remaining business coupling from generic engine packages

**Status:** OPEN (watchlist; non-blocking for zero-state cloneability, which is verified — D050).
**Why not done in the agent session:** requires `git mv` (file relocation) and `pnpm install` (new workspace dependency edge), both of which fail under the agent sandbox's mounted filesystem (EPERM). Also, the coupled code paths only execute when a project is *active*, so they can't be runtime-verified from the frozen zero-state baseline. Execute this on a normal developer checkout.

## The leak

Two packages under `packages/connectors/` are generic engines but still hardcode the FoodTruck connector:

1. **`packages/connectors/portfolio-intelligence/src/bundle-resolver.ts`**
   - `import { … } from '@ai-company/connector-foodtruck-business'`
   - `if (project.connector.connectorType === 'foodtruck-business') return foodTruckBundleFromRegistry(project)`
   - same branch in `buildFunnelSnapshotForProject`
   - `connector-foodtruck-business` is a declared dependency in `portfolio-intelligence/package.json`.

2. **`packages/connectors/revenue/src/index.ts` + `revenue/src/foodtruck.ts`**
   - `createRevenueConnectorForProject` switches on `config.revenueSource === 'foodtruck-supabase-events'` → `createFoodTruckRevenueConnector`.
   - `revenue/src/foodtruck.ts` is a FoodTruck-specific implementation living inside the generic package.

## Target architecture (registry / dependency inversion)

No generic package may name `foodtruck-business`, `foodtruck-il`, truck owners, or a specific connector implementation. Only the instance/connector layer may.

1. **Add a resolver registry to `portfolio-intelligence`** (generic, no connector imports):
   ```ts
   // bundle-resolver-registry.ts
   type BundleResolver = {
     buildBundle(project: RegisteredProject): Promise<ProjectIntelligenceBundle>;
     buildFunnelSnapshot(project: RegisteredProject): Promise<FunnelSnapshot>;
   };
   const registry = new Map<string, BundleResolver>();
   export function registerBundleResolver(connectorType: string, r: BundleResolver) { registry.set(connectorType, r); }
   export function getBundleResolver(connectorType: string): BundleResolver | undefined { return registry.get(connectorType); }
   ```
   `buildBundleForProject` / `buildFunnelSnapshotForProject` look up `registry.get(project.connector.connectorType)`; if none, use the existing generic `mockFunnelBundle` / `analyzeFunnel` fallback. Remove the `connector-foodtruck-business` import and the `=== 'foodtruck-business'` branches. Remove the dep from `portfolio-intelligence/package.json`.

2. **Same pattern for `revenue`**: a `RevenueSourceFactory` registry keyed by `revenueSource`. Built-in generic sources (`supabase-ledger`, `mock-revenue`, `stripe`/`erp`/`csv-import` placeholders) stay; the `foodtruck-supabase-events` case is removed from the switch.

3. **Move the FoodTruck implementations to the connector layer:**
   - `git mv packages/connectors/revenue/src/foodtruck.ts connectors/foodtruck-il/...` (or into `connector-foodtruck-business`).
   - The FoodTruck bundle resolver logic (`foodTruckBundleFromRegistry`, `fetchFunnelSnapshot` wiring) already has a home in `connector-foodtruck-business`.

4. **Register from the instance layer** (`instances/yoni-company`):
   - Add `@ai-company/connector-foodtruck-business` (and the relocated revenue source) to `instances/yoni-company/package.json`.
   - In an instance module (e.g. `instances/yoni-company/instance-resolvers.ts`, exposed via a new `@active-instance/instance-resolvers` tsconfig alias), call `registerBundleResolver('foodtruck-business', …)` and `registerRevenueSource('foodtruck-supabase-events', …)`.
   - Invoke that registration once at composition time in `apps/executive-dashboard/lib/platform.ts` (alongside the existing `registerInstance*` calls).
   - `pnpm install` to link the new instance edges.

## Verification — run in order; all must pass before locking D052

Execute only in a real dev checkout (git mv / file deletion / pnpm install must work). Do NOT modify code for P015B in the agent sandbox — preserve the D050 zero-state baseline.

1. `pnpm install`
2. `pnpm -r typecheck` — clean.
3. `pnpm test` — clean.
4. `pnpm audit:leaks` — PASS.
5. **Re-run Test E:** `grep -rniE 'foodtruck|lab-os|inventory-engine|whatsapp-engine' --include=*.ts --include=*.tsx packages apps | grep -v node_modules` → **only** comments / explicit test fixtures; **zero** in `packages/connectors/portfolio-intelligence` and `packages/connectors/revenue`.
6. **One active-project validation:** register a foodtruck project, confirm portfolio + revenue panels still populate (the instance-registered resolver path works), then return to zero-state and confirm clean.

## Then

- Lock **D052 — Generic Platform Layer Verified** (no company-specific business logic remains in platform packages).
- Commit with the accurate message:
  ```
  P015A/P015B: generic platform verified
  - zero-state runtime verified (D050)
  - backup/restore documented (D051)
  - generic layer business coupling removed (D052)
  - registry-driven runtime confirmed
  ```
