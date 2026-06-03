# Phase 2 — Real Data Integration

**Status:** In execution  
**Governance:** Frozen (Draft v1.0) — do not modify operating model or dashboard/portfolio specs.

## Objective

Transform ai-company from mock/demo data into a **real data-driven operating system** so the CEO can answer daily questions from live GitHub and Supabase signals.

## Connector architecture

### Platform connectors (`packages/connectors/`)

| Connector | Purpose | Auth | Output |
|-----------|---------|------|--------|
| **GitHub v1** | Engineering activity | `GITHUB_TOKEN` + `GITHUB_REPOSITORY` | `GithubMetrics` |
| **Supabase v1** | Platform DB health | `SUPABASE_SERVICE_ROLE_KEY` + URL | `SupabaseMetrics` |

These are **read-only collectors**. They do not implement `DataConnector` sync, do not call LLMs, and do not compute executive insights.

### Project connectors (`connectors/*`)

Existing portfolio connectors (FoodTruck-IL, Lab OS, etc.) continue to feed `SyncOrchestrator` → `projects` / `metrics` / `risks`. Phase 2 does not replace them; it adds **company-level** observability alongside.

## Data flow

```
GitHub API ──► GithubConnector.fetchMetrics() ──┐
                                                ├──► Dashboard (server components)
Supabase API ─► SupabaseConnector.fetchMetrics()─┤
                                                │
Risks DB ─────► HealthScoreService.calculate() ─┘
                                                │
Metrics bundle ─► DailyBriefGenerator (LLM explains only)
```

1. **Collect** — HTTP/Supabase reads normalize to typed metrics interfaces.
2. **Score** — `health-score` service applies deterministic formula (no AI).
3. **Display** — Executive dashboard overview shows health, GitHub, Supabase, risks, approvals.
4. **Brief** — Chief of Staff receives the metric bundle and produces narrative `DailyBrief`.

## Health score inputs

| Input | Source (v1) |
|-------|-------------|
| `criticalIssues` | Open risks with `critical` severity + GitHub issues labeled `critical` (if API provides) |
| `failedDeployments` | Env `FAILED_DEPLOYMENTS_COUNT` or 0 until CI integration |
| `highPriorityIssues` | GitHub `openIssues` (cap applied in service) |

Formula: `score = clamp(100 - 5×critical - 3×failed - 1×high, 0, 100)`  
Levels: green ≥ 80, yellow ≥ 50, red &lt; 50.

## Dashboard inputs

| Panel | Data |
|-------|------|
| Company Health | `HealthScore` |
| GitHub Metrics | `GithubMetrics` |
| Supabase Metrics | `SupabaseMetrics` |
| Top Risks | `repos.risks.listOpen()` (severity sort) |
| Pending Approvals | Open risks/opportunities with approval keywords + FoodTruck `pending_trucks` metric when synced |

## Out of scope (Phase 2)

- New AI executives or governance documents
- Autonomous actions, spending logic, portfolio optimizer
- Strategic planning engine
- Cron/schedulers (manual sync + page load fetch for v1)

## Success criteria

CEO opens dashboard and can answer:

1. **What is happening?** — Live GitHub + Supabase panels
2. **What is broken?** — Red/yellow health + top risks
3. **What requires approval?** — Pending approvals panel
4. **What needs attention today?** — Daily CEO brief (narrative over same metrics)

## Environment variables

```bash
GITHUB_TOKEN=
GITHUB_REPOSITORY=owner/repo
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SCHEMA=ai_company
FAILED_DEPLOYMENTS_COUNT=0
```
