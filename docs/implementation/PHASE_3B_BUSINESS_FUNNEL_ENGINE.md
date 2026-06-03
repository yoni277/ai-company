# Phase 3B — Business Funnel Intelligence Engine

**Status:** In execution  
**Phase 3A:** Complete and accepted  
**Out of scope:** Revenue intelligence, CFO forecasting, FoodTruck-specific activation logic in the engine, new AI executives, governance changes

## Business objective

Build a **reusable Business Funnel Intelligence Engine** so future portfolio companies need **funnel configuration only**, not custom funnel code.

FoodTruck-IL is the **first implementation**. Lab-OS, Inventory Engine, and BurgerStop add config + connector counts later.

## Generic funnel model

| Type | Purpose |
|------|---------|
| `FunnelStage` | Ordered stage definition (id, label, order) |
| `FunnelMetric` | Count at a stage |
| `FunnelSnapshot` | Full analyzed funnel for one project |
| `FunnelConversion` | Adjacent-stage conversion rate |
| `FunnelHealth` | Deterministic status, bottlenecks, drop-offs |

## Engine responsibilities (`@ai-company/business-funnel-engine`)

- Accept funnel stages as configuration
- Accept counts per stage
- Calculate conversion rates between adjacent stages
- Detect bottlenecks (lowest conversion with volume)
- Detect drop-offs (lost count between stages)
- Return deterministic funnel health
- **No AI. No LLM.**

## Example funnel configurations

| Company | Stages |
|---------|--------|
| FoodTruck-IL | Registered → Approved → Active |
| Lab-OS | Lead → Demo → Pilot → Subscribed → Active |
| BurgerStop | Lead → Meeting → Proposal → Signed → Operating |

## Data flow (Phase 3B)

1. Connector fetches raw business counts (FoodTruck: `trucks` / `truck_events`)
2. Connector maps counts to stage ids via **config** (not engine-specific logic)
3. Engine `analyzeFunnel()` produces `FunnelSnapshot`
4. Dashboard **Funnel Intelligence** panel renders any `FunnelSnapshot`
5. CEO brief includes deterministic `formatFunnelSummary()` per snapshot

## Dashboard additions

- **Funnel Intelligence** panel (generic renderer)
- Phase 2 and Phase 3A panels unchanged

## Daily CEO brief

New section: **Funnel summary** (deterministic).

Example: *"FoodTruck-IL funnel: 12 registered, 11 approved, 5 active. Main bottleneck: Approved → Active."*

## Success metrics

| Metric | Target |
|--------|--------|
| Engine unit logic | Deterministic, no LLM |
| FoodTruck maps to generic snapshot | Live counts |
| Conversions & bottleneck | Calculated correctly |
| Dashboard renders generic funnel | Any project snapshot |
| Brief includes funnel summary | Matches dashboard |

## Acceptance criteria

- [ ] `GET /api/metrics/funnel` returns FoodTruck funnel snapshot
- [ ] Conversion rates calculated between adjacent stages
- [ ] Main bottleneck detected
- [ ] Dashboard Funnel Intelligence panel visible
- [ ] CEO brief includes funnel summary
- [ ] `pnpm build` and `pnpm typecheck` pass
- [ ] `docs/project-management/PHASE_3B_VALIDATION.md` completed

**Do not proceed to revenue intelligence until Phase 3B is validated and accepted.**
