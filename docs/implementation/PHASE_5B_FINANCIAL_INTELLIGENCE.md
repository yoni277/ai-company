# Phase 5B — Financial Intelligence Engine

**Status:** In execution  
**Phase 5A:** Complete and accepted  
**Out of scope:** Financial health scoring (Phase 5C), forecasting, budgeting, autonomous spending, financial recommendations, governance changes, new AI executives

## Objective

Standardize **financial intelligence** across all portfolio projects before financial health scoring. Phase 5A created revenue visibility; Phase 5B adds a reusable layer for **normalized financial snapshots**, **deterministic trends**, and **portfolio-level financial overview**.

The system **observes financial performance only** — no decisions, warnings, or recommendations.

## Architecture

```
Phase 5A revenue snapshots (RevenueConnector — unchanged contract)
        ↓
@ai-company/financial-intelligence-engine
   ├── revenueSnapshot → FinancialSnapshot (normalize currency)
   ├── per-project FinancialIntelligenceSnapshot + FinancialTrend
   └── PortfolioFinancialSnapshot (totals + projects[])
        ↓
Portfolio intelligence · Dashboard · CEO brief
```

- **No AI. No LLM.**
- **No health scoring** (deferred to Phase 5C).
- **Trends:** `revenueGrowthPercent` / `transactionGrowthPercent` computed only when a **previous** snapshot exists for that project; otherwise `null`.
- **Priority ranking unchanged** — financial data is visibility only.

## Financial data model

| Type | Purpose |
|------|---------|
| `FinancialSnapshot` | Flat per-project financial facts (revenue, recurring, transactions, ATV, currency, capturedAt) |
| `FinancialTrend` | Period-over-period growth % (nullable) |
| `FinancialIntelligenceSnapshot` | Project + financial + trend |
| `PortfolioFinancialSnapshot` | Portfolio totals + per-project intelligence rows |

Revenue types (`RevenueSnapshot`, `PortfolioRevenueSnapshot`) remain for Phase 5A connectors and panels.

## Trend calculation model

Deterministic percent change:

```
growth% = round10(((current - previous) / previous) * 100)
```

- If **no previous snapshot** for a project → both trend fields `null`.
- If previous revenue or transaction count is **0** and current > 0 → growth reported as **100%** (same rule as revenue engine).
- Portfolio totals do not embed trend; per-project rows carry `FinancialTrend`.
- Historical snapshots may be supplied later (e.g. persisted ledger); until then trends are `null` in production.

## Dashboard additions

- **Financial Intelligence** panel: portfolio totals + per-project table with Revenue Growth % and Transaction Growth % (`N/A` when null).
- Phase 5A **Revenue Overview** panel retained.

## CEO brief additions

- **Financial Overview** section: one visibility sentence per project (revenue + transactions + trend availability).
- No recommendations, warnings, or forecasting language.

## Acceptance criteria

| Criterion | Required |
|-----------|----------|
| Financial snapshots derived from revenue data | Yes |
| Portfolio totals aggregated deterministically | Yes |
| Trends null without previous snapshot | Yes |
| Dashboard Financial Intelligence panel | Yes |
| CEO brief financial overview | Yes |
| `typecheck` + dashboard `build` pass | Yes |
| No recommendations or health scoring | Yes |

## CEO success questions

- Total financial performance across the portfolio? → `PortfolioFinancialSnapshot` totals  
- Which project generated revenue? → per-project rows  
- How many transactions? → `transactionCount`  
- Average transaction value? → `averageTransactionValue`  
- Are financial trends available? → non-null `FinancialTrend` fields when history exists  
