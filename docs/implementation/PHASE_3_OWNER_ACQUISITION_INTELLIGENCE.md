# Phase 3A — Owner Acquisition Intelligence

**Status:** In execution  
**Phase 2:** Complete and accepted  
**Out of scope:** Revenue intelligence, CFO forecasting, new AI executives, governance changes

## Business objective

Give the AI Company **visibility into the FoodTruck-IL owner onboarding funnel** so the CEO can answer:

- How many trucks are registered?
- How many are approved?
- How many are pending approval?
- How many are active?
- Is onboarding improving or getting worse?

## Data sources

| Source | Schema | Tables |
|--------|--------|--------|
| FoodTruck Supabase (production) | `public` | `trucks`, `truck_events`, `user_profiles` |

Read-only via `@ai-company/connector-foodtruck-business` using the same credentials as `FoodTruckIlConnector`:

- `FOODTRUCK_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `FOODTRUCK_SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

No LLM. No writes.

## Metric definitions

| Metric | Definition |
|--------|------------|
| `totalRegisteredTrucks` | All rows in `trucks` |
| `approvedTrucks` | `status = approved` |
| `pendingTrucks` | `status = pending` |
| `rejectedTrucks` | `status = rejected` |
| `activeTrucks` | Approved trucks with ≥1 `truck_events` row in last 7 days |
| `registrationsLast30Days` | Trucks with `created_at` in last 30 days |
| `approvalsLast30Days` | Approved trucks with `updated_at` in last 30 days (approval proxy) |
| `activationRate` | `(activeTrucks / approvedTrucks) × 100`, 0 if no approvals |

## Dashboard additions

New **Owner Acquisition** panel on Overview (below Phase 2 production metrics):

- Total Trucks
- Approved Trucks
- Pending Trucks
- Active Trucks
- Activation Rate

Phase 2 panels (GitHub, Supabase, health, risks) remain unchanged.

## Daily CEO brief

New deterministic section: **Owner Acquisition Summary** (no LLM math).

Example: *"45 trucks registered. 12 approved. 8 pending review. Activation rate 27%."*

## Success metrics

| Metric | Target |
|--------|--------|
| Connector live against FoodTruck DB | `live: true` |
| Registry counts match Supabase | Manual spot-check |
| Dashboard renders all five cards | CEO can read in &lt;10s |
| Brief includes owner acquisition | Same numbers as dashboard |

## Acceptance criteria

- [ ] `GET /api/metrics/foodtruck-business` returns live data
- [ ] Dashboard shows owner acquisition cards
- [ ] CEO brief includes owner acquisition summary
- [ ] `pnpm build` and `pnpm typecheck` pass
- [ ] `docs/project-management/PHASE_3A_VALIDATION.md` completed

**Do not proceed to revenue intelligence until Phase 3A is validated and accepted.**
