# AI-Company — Open Risks (June 2026)

**Status:** Living document aligned with implemented platform (not a risk register in DB).

---

## Technical risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| T1 | Composite TypeScript projects (`shared-types`) require `tsc -b` before dependent packages typecheck | CI/local confusion | Build shared-types in CI before dashboard |
| T2 | PostgREST must expose `ai_company` schema | API failures in production | Document in Supabase Dashboard settings |
| T3 | FoodTruck DB separate from platform DB | Connector env misconfiguration | Distinct `FOODTRUCK_*` env vars |
| T4 | No financial snapshot history store | Trends always N/A | Add history job when business ready |
| T5 | In-memory CEO OS fallback in `mock` data mode | Directives/decisions not durable | Require `supabase` mode in production |

---

## Business risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| B1 | **6 inactive approved FoodTruck trucks** | Revenue / retention | CEO activation sprint (Meeting #001) |
| B2 | Decisions on mock funnel treated as fact | Wrong operational bets | Live/mock badges; meeting guardrails |
| B3 | BurgerStop / Lab-OS delay | Portfolio stays 1/4 live | 30-day operating plan |
| B4 | CEO directive overload without review cadence | Drift from strategy | Weekly Command Center review |

---

## Data maturity risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| D1 | **75% of projects on mock funnel** | Portfolio priorities include noise | Weight FoodTruck-first; cutover plan |
| D2 | **~74% of portfolio revenue dollars are mock** | Misleading CFO rollup | Do not use ₪30k total as P&L |
| D3 | Portfolio “healthiest” project can be mock (BurgerStop) | CEO misread | Explain ranking inputs in Command Center |
| D4 | Registry `mock_count` on stages | Funnel cards look real | Registry UI shows “(N mock)” |

---

## Revenue visibility limitations

| Limitation | Detail |
|------------|--------|
| No payment ledger (FoodTruck) | Amounts = `transactionCount × avgTransactionValue` + subscription fee from config |
| No Stripe/ERP live | Stub connectors return mock or zero |
| `revenue_transactions` table empty | `supabase-ledger` path unused until ingestion |
| Portfolio trend null | No prior snapshot persistence |
| Currency normalization | Fixed FX rates in engine (deterministic, not market) |

---

## Mock-data limitations

| Area | Behavior |
|------|----------|
| Lab-OS / Inventory / BurgerStop funnel | Static `mock_count` in DB seed |
| Mock revenue | JSON config in `project_connector_configs` |
| Decision support on mock | Actions are deterministic but **not grounded in real CRM** |
| LLM brief | Explains pre-computed numbers only — cannot fix mock upstream |

---

## CEO Operating System risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| C1 | User expects approve → auto outreach | Trust failure | UI: “CEO-in-the-loop · no autonomous execution” |
| C2 | Duplicate decisions per `source_action_id` | Data clutter | Upsert pattern in UI (PATCH existing) |
| C3 | Deferred/rejected actions still in queue display | UX confusion | Filter pending actions by status |

---

## Explicitly out of scope (not risks — deferred)

| Item | Status |
|------|--------|
| Phase 5C Financial Health Engine | **Not started** |
| Autonomous spending | **Not built** |
| Autonomous messaging / outreach | **Not built** |
| Forecasting / budgeting | **Not built** |

---

## Risk review cadence

- **Weekly:** Executive Command Center + Meeting #002 minutes  
- **After connector cutover:** Update this document and [DATA_MATURITY_REPORT.md](./DATA_MATURITY_REPORT.md)
