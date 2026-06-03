# AI-Company — Project Inventory (June 2026)

Packages requested for inventory. **Owner** = maintaining team role in monorepo (no separate CODEOWNERS file).

---

## `@ai-company/business-funnel-engine`

| Field | Value |
|-------|--------|
| **Purpose** | Deterministic funnel math: stage metrics, conversion rates, bottleneck detection |
| **Status** | ✅ Production — Phase 3B |
| **Owner** | Platform / intelligence |
| **Dependencies** | `@ai-company/shared-types` |
| **Inputs** | `FunnelDefinition` (stages + counts from registry or live adapter) |
| **Outputs** | `FunnelSnapshot`, `FunnelHealth`, conversion rows |

---

## `@ai-company/decision-support-engine`

| Field | Value |
|-------|--------|
| **Purpose** | Format and rank recommended actions; brief-friendly strings. No execution |
| **Status** | ✅ Production — Phase 3C |
| **Owner** | Platform / intelligence |
| **Dependencies** | `@ai-company/shared-types` |
| **Inputs** | Funnel snapshots, project-specific adapters (e.g. FoodTruck rules) |
| **Outputs** | `RecommendedAction[]`, `DecisionSupportResult` |

---

## `@ai-company/portfolio-intelligence-engine`

| Field | Value |
|-------|--------|
| **Purpose** | Aggregate project bundles into portfolio health, priorities, action queue |
| **Status** | ✅ Production — Phase 4A |
| **Owner** | Platform / intelligence |
| **Dependencies** | `@ai-company/shared-types` |
| **Inputs** | `ProjectIntelligenceBundle[]`, optional `PortfolioRevenueSnapshot`, optional `PortfolioFinancialSnapshot` |
| **Outputs** | `PortfolioIntelligenceSnapshot`, `formatPortfolioSummary()` |

**Note:** Revenue/financial on snapshot do **not** change priority ranking (visibility only).

---

## `@ai-company/project-registry`

| Field | Value |
|-------|--------|
| **Purpose** | Load project definitions, funnel stages, connector configs from DB or in-memory seed |
| **Status** | ✅ Production — Phase 4B/4C (`source: database`) |
| **Owner** | Platform / data |
| **Dependencies** | `@ai-company/database`, `@ai-company/shared-types`, `@supabase/supabase-js` |
| **Inputs** | Supabase `ai_company` registry tables or `buildInMemoryRegistrySeed()` |
| **Outputs** | `RegisteredProject[]`, validation result, `source: 'database' \| 'in-memory'` |

---

## `@ai-company/revenue-intelligence-engine`

| Field | Value |
|-------|--------|
| **Purpose** | Normalize currency, aggregate portfolio revenue, format CEO brief revenue lines |
| **Status** | ✅ Production — Phase 5A |
| **Owner** | Platform / intelligence |
| **Dependencies** | `@ai-company/shared-types` |
| **Inputs** | `RevenueSnapshot[]`, optional previous snapshots for trends |
| **Outputs** | `PortfolioRevenueSnapshot`, `formatRevenueSummaries()` |

---

## `@ai-company/financial-intelligence-engine`

| Field | Value |
|-------|--------|
| **Purpose** | Convert revenue snapshots to financial intelligence; per-project trends when history exists |
| **Status** | ✅ Production — Phase 5B |
| **Owner** | Platform / intelligence |
| **Dependencies** | `@ai-company/revenue-intelligence-engine`, `@ai-company/shared-types` |
| **Inputs** | `RevenueSnapshot[]`, optional previous snapshots |
| **Outputs** | `PortfolioFinancialSnapshot`, `formatFinancialOverviews()` |

**Not included:** financial health scoring (Phase 5C deferred).

---

## `@ai-company/connector-foodtruck-business`

| Field | Value |
|-------|--------|
| **Purpose** | Live FoodTruck-IL metrics: trucks, events, owner acquisition, funnel counts, decision-support adapter |
| **Status** | ✅ Production — Phase 3A+ |
| **Owner** | Connectors |
| **Dependencies** | `@ai-company/shared-types`, `@supabase/supabase-js` |
| **Inputs** | FoodTruck `public.trucks`, `public.truck_events` (separate Supabase project or schema) |
| **Outputs** | `FoodTruckBusinessMetrics`, funnel stage counts, `RecommendedAction` extensions |

---

## `@ai-company/connector-revenue`

| Field | Value |
|-------|--------|
| **Purpose** | `RevenueConnector` contract; registry-driven revenue sources per project |
| **Status** | ✅ Production — Phase 5A |
| **Owner** | Connectors |
| **Dependencies** | `@ai-company/project-registry`, `@ai-company/shared-types`, `@supabase/supabase-js` |
| **Inputs** | `RegisteredProject`, env credentials per source type |
| **Outputs** | `RevenueSnapshot` per project via `loadRevenueSnapshots()` |

**Implementations:** `foodtruck-supabase-events`, `mock-revenue`, `supabase-ledger`, stubs for stripe/erp/csv.

---

## `@ai-company/executive-dashboard`

| Field | Value |
|-------|--------|
| **Purpose** | Next.js CEO UI: Overview, Registry, Command Center, APIs, executive pages |
| **Status** | ✅ Production — Phases 2–5C.1 + Command Center |
| **Owner** | Applications |
| **Dependencies** | All intelligence packages, connectors, `database`, `ai-chief-of-staff`, `@supabase/supabase-js` |
| **Inputs** | Env vars, Supabase, external FoodTruck/GitHub APIs |
| **Outputs** | Rendered pages, REST routes under `/api/*`, persisted CEO directives/decisions |

**Key libs:** `lib/platform.ts`, `lib/phase2-metrics.ts`, `lib/command-center.ts`, `lib/ceo-operating-system.ts`.

---

## Related orchestration packages (not in original list)

| Package | Role |
|---------|------|
| `@ai-company/connector-portfolio-intelligence` | Loads portfolio + revenue for dashboard |
| `@ai-company/ai-chief-of-staff` | Daily brief generation |
| `@ai-company/database` | Projects, risks, metrics repositories |
| `@ai-company/shared-types` | Shared contracts |

See [CURRENT_SYSTEM_STATE.md](./CURRENT_SYSTEM_STATE.md).
