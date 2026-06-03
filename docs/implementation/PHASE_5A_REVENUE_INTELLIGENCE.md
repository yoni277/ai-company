# Phase 5A — Revenue Intelligence

**Status:** In execution  
**Phase 4C:** Complete and accepted  
**Out of scope:** Forecasting, budgeting, autonomous spending, financial planning, governance changes

## Objective

Give AI-Company **visibility into project-level financial performance** using deterministic metrics. The system **observes revenue** — it does not make financial decisions.

## Architecture

```
Project registry (connector_type: revenue source)
        ↓
@ai-company/connector-revenue  (RevenueConnector contract)
   ├── foodtruck-supabase-events (live event volume × configured unit economics)
   ├── supabase-ledger (ai_company.revenue_transactions)
   ├── mock-revenue (placeholder projects)
   └── future: stripe | erp | csv-import
        ↓
@ai-company/revenue-intelligence-engine  (aggregate, normalize, trends)
        ↓
Portfolio intelligence · Dashboard · CEO brief
```

- **No AI. No LLM.**
- **Visibility only** — no recommendations, no ranking changes in Phase 5A.

## Data model

| Type | Purpose |
|------|---------|
| `RevenueMetrics` | total, recurring, transaction count, ATV, currency |
| `RevenueSnapshot` | Per-project metrics + `capturedAt` |
| `PortfolioRevenueSnapshot` | Per-project rollups + portfolio totals + trend |

### Ledger table (`ai_company.revenue_transactions`)

| Column | Notes |
|--------|--------|
| `project_slug` | Links to registry |
| `amount` | Transaction amount |
| `currency` | ISO code (normalized to display currency in engine) |
| `is_recurring` | Subscription / MRR line items |
| `occurred_at` | Reporting window filter |

FoodTruck-IL (live): reads **real** `public.truck_events` counts in the reporting window; amounts use registry-configured unit economics until a payments table exists.

## Dashboard additions

**Revenue Overview** on Overview:

- Total Revenue, Recurring Revenue, Transactions, Average Transaction Value
- Per project + portfolio totals
- Live / mock badge per project

## Daily CEO brief

**Revenue Summary** — one line per project with revenue, deterministic.

Example: *"FoodTruck-IL generated ₪12,500 from 38 transactions during the reporting period."*

No recommendations. No forecasting.

## Acceptance criteria

- [ ] Revenue snapshots load per project
- [ ] Portfolio aggregates revenue (ranking unchanged)
- [ ] Dashboard Revenue Overview visible
- [ ] CEO brief includes revenue summary
- [ ] `pnpm build` and `pnpm typecheck` pass
- [ ] `docs/project-management/PHASE_5A_VALIDATION.md` completed

**Do not proceed to forecasting or budgeting until Phase 5A is validated and accepted.**
