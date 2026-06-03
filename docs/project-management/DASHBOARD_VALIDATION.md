# Dashboard Validation

**Date:** 2026-06-03  
**App:** `apps/executive-dashboard`  
**URL:** `http://localhost:3000/`  
**Status:** **PASS** (Phase 2 panels); **PARTIAL** (portfolio layer)

## Panels verified

| Panel | Visible | Data source |
|-------|---------|-------------|
| Company Health | ✅ | Live — score `100`, level `green` (`GET /api/health/score`) |
| GitHub Metrics | ✅ | **Live** — `yoni277/foodtruck-il-backend`, 46 commits (7d) |
| Supabase Metrics | ✅ | **Live** — 4 projects, DB healthy |
| Top Risks | ✅ | **Mock** — `AI_COMPANY_DATA_MODE=mock` (in-memory repos) |
| Pending Approvals | ✅ | **Mock** — seeded / keyword rules on mock portfolio |

## Live vs mock (remaining)

| Section | Mode |
|---------|------|
| Phase 2 GitHub panel | **Live** (`live: true`) |
| Phase 2 Supabase panel | **Live** (`live: true`, `databaseHealthy: true`) |
| Company health score | **Live inputs** from real GitHub + DB risks (risks still mock-backed) |
| Projects list | **Mock** |
| Open risks / opportunities (lower sections) | **Mock** |
| Legacy Chief of Staff briefing | **Mock repos** (separate flow) |
| Phase 2 Daily CEO brief | **Live GitHub + live Supabase** metrics in narrative |

## API evidence (2026-06-03)

```
GET /                           → 200
GET /api/metrics/github         → 200, live: true
GET /api/metrics/supabase       → 200, live: true, databaseHealthy: true
GET /api/health/score           → score: 100, level: green
POST /api/chief-of-staff/daily-brief → 200, grounded in live connector metrics
```

## Runtime errors

None observed during validation.

## Recommended follow-ups (not blocking Phase 2 connectors)

1. Set `AI_COMPANY_DATA_MODE=supabase` to move portfolio (projects/risks/reports) off in-memory mock.
2. Run connector sync to populate `project_metrics` and raise `recentActivityCount`.
3. Capture dashboard screenshots for CEO sign-off archive.

## Validation status

**PASS** — Phase 2 production metrics panels display **real GitHub and Supabase data**.
