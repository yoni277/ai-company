# Dashboard Validation

**Date:** 2026-06-03  
**App:** `apps/executive-dashboard` (`http://localhost:3000`)  
**Page:** Overview (`/`)

## Panels verified (UI structure)

| Panel | Visible | Data source (current) |
|-------|---------|------------------------|
| Company Health | ✅ | Deterministic health score from GitHub issue count + DB risks |
| GitHub Metrics | ✅ | **Mock** (`live: false`) |
| Supabase Metrics | ✅ | **Live connector, empty DB** (`live: true`, zeros) |
| Top Risks | ✅ | In-memory repos (`AI_COMPANY_DATA_MODE=mock`) |
| Pending Approvals | ✅ | In-memory + keyword / FoodTruck metric rules |

## Live vs mock sections

| Section | Mode | Notes |
|---------|------|-------|
| Phase 2 GitHub panel | **Mock** | No `GITHUB_TOKEN` / `GITHUB_REPOSITORY` |
| Phase 2 Supabase panel | **Live attempt** | Credentials OK; schema not exposed → zeros |
| Company health score | **Mixed** | Formula is real; inputs include mock GitHub issues |
| Projects list (below fold) | **Mock** | `AI_COMPANY_DATA_MODE=mock` |
| Open risks / opportunities | **Mock** | Seeded in-memory on first load |
| Chief of Staff legacy briefing | **Mock / LLM** | Separate from Phase 2 daily brief |
| Daily CEO brief (Phase 2) | **Mock narrative** | Uses metrics bundle above |

## API evidence (2026-06-03)

```
GET /api/metrics/github     → live: false, repositoryName: "ai-company (mock)"
GET /api/metrics/supabase   → live: true,  databaseHealthy: false, counts: 0
GET /api/health/score       → { "score": 96, "level": "green" }
```

## Environment finding

`.env.local` at **repo root** is not loaded by Next.js dev server by default. After copying to `apps/executive-dashboard/.env.local`:

- Supabase API flipped to `live: true`
- GitHub still mock (missing token)

**Recommended fix:** Document in README that dashboard env lives in `apps/executive-dashboard/.env.local`, or add `envDir` in `next.config.mjs` pointing to monorepo root (no code change required for validation if copy step is documented).

## Screenshots

_Capture manually after unblock:_

1. Overview with **GitHub live** + **Supabase live** badges  
2. Non-zero Supabase metrics  
3. Pending approvals with real FoodTruck pending trucks (supabase mode + sync)

## Issues found

1. **GitHub not configured** — CEO sees mock engineering metrics.  
2. **`ai_company` schema not exposed** — Supabase connector live but unhealthy.  
3. **Portfolio still mock** — `AI_COMPANY_DATA_MODE=mock`.  
4. **Root `.env.local` not picked up** by Next without app-level copy.  
5. **Health score green (96)** while Supabase unhealthy — misleading until inputs reflect live data.

## Recommended fixes (no new features)

| Priority | Fix |
|----------|-----|
| P0 | Expose `ai_company` schema in Supabase API settings |
| P0 | Add GitHub PAT + `GITHUB_REPOSITORY` to app `.env.local` |
| P1 | Set `AI_COMPANY_DATA_MODE=supabase` after schema + seed |
| P1 | Document env file location for monorepo dashboard |
| P2 | Surface `databaseHealthy: false` as red badge on Supabase panel |

## Validation status

**⚠️ PARTIAL** — Layout and Phase 2 panels work; **real production metrics not yet end-to-end**.
