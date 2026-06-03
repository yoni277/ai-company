# Phase 2 Validation

**Date:** 2026-06-03  
**Scope:** Real GitHub + Supabase data, deterministic health score, production metrics dashboard, daily CEO brief generator.

## Build status

| Check | Result | Command |
|-------|--------|---------|
| Dashboard production build | ✅ Pass | `corepack pnpm -C apps/executive-dashboard build` |
| GitHub connector typecheck | ✅ Pass | `corepack pnpm -C packages/connectors/github typecheck` |
| Supabase connector typecheck | ✅ Pass | `corepack pnpm -C packages/connectors/supabase typecheck` |
| Health score typecheck | ✅ Pass | `corepack pnpm -C packages/services/health-score typecheck` |

## Lint status

| Package | Result |
|---------|--------|
| `apps/executive-dashboard` | ⚠️ `next lint` CLI quirk in Next 16 — use `next build` TS pass instead |

## Typecheck status

| Area | Result | Notes |
|------|--------|-------|
| Phase 2 packages | ✅ | github, supabase, health-score |
| Full monorepo `pnpm -r typecheck` | ⚠️ | Some legacy connector packages require `shared-types` build first |
| Dashboard (via `next build`) | ✅ | Includes strict TS pass |

## Connector validation

### GitHub (`@ai-company/connector-github`)

- **Env:** `GITHUB_TOKEN`, `GITHUB_REPOSITORY=owner/repo`
- **Collects:** open issues (excl. PRs), open PRs, commits (7d), repository name
- **Mock fallback:** when env unset — dashboard shows `GitHub mock` badge
- **API:** `GET /api/metrics/github`

### Supabase (`@ai-company/connector-supabase`)

- **Env:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SCHEMA=ai_company`
- **Collects:** projects count, 7d activity (metrics + reports + risks), DB ping, metric write count
- **Read-only:** no inserts/updates/deletes
- **Mock fallback:** when env unset — dashboard shows `Supabase mock` badge
- **API:** `GET /api/metrics/supabase`

### Health score (`@ai-company/health-score`)

- **Formula:** `100 - 5×critical - 3×failedDeployments - 1×highPriority`
- **Levels:** green ≥ 80, yellow ≥ 50, red &lt; 50
- **No LLM**
- **API:** `GET /api/health/score`

## Dashboard (CEO view)

Overview (`/`) includes Phase 2 panels:

1. **Company health** — deterministic score + level  
2. **GitHub metrics** — issues, PRs, commits (7d)  
3. **Supabase metrics** — projects tracked, activity, DB health  
4. **Top risks** — from platform DB  
5. **Pending approvals** — keyword match + FoodTruck `pending_trucks` metric  
6. **Daily CEO brief** — deterministic on load; **Regenerate CEO brief (LLM)** when `OPENAI_API_KEY` set  

## Sample CEO brief (deterministic, mock metrics)

```json
{
  "companyHealth": "Company health score is 96/100 (green). GitHub shows 4 open issues and 18 commits in the last 7 days on ai-company (mock). Supabase reports 42 recent activity events; database is healthy.",
  "topRisks": [
    "GitHub issue backlog is 4 — within normal range.",
    "No critical health score alert.",
    "Platform database is responding normally."
  ],
  "opportunities": [
    "Strong engineering velocity: 18 commits this week.",
    "2 open PR(s) ready for review.",
    "High platform activity — good signal for portfolio monitoring."
  ],
  "approvalsWaiting": ["No pending approvals."]
}
```

**API:** `POST /api/chief-of-staff/daily-brief`

## PMO & documentation

| Artifact | Path |
|----------|------|
| Master plan (xlsx) | `docs/project-management/AI_COMPANY_MASTER_PLAN.xlsx` |
| Decision log | `docs/project-management/DECISION_LOG.md` |
| Risk register | `docs/project-management/RISK_REGISTER.md` |
| Architecture change log | `docs/project-management/ARCHITECTURE_CHANGE_LOG.md` |
| Weekly status | `docs/project-management/WEEKLY_STATUS_REPORT.md` |
| Phase 2 plan | `docs/implementation/PHASE_2_REAL_DATA_INTEGRATION.md` |

## Screenshots

_Add dashboard screenshots after running with live credentials:_

1. Overview with **GitHub live** + **Supabase live** badges  
2. Health score panel (green/yellow/red)  
3. Pending approvals populated (e.g. FoodTruck pending trucks)  
4. Daily CEO brief section  

## Live validation checklist

- [ ] Set `GITHUB_TOKEN` + `GITHUB_REPOSITORY` → GitHub badge shows **live**  
- [ ] Set Supabase env + `AI_COMPANY_DATA_MODE=supabase` → Supabase badge shows **live**  
- [ ] CEO can answer: what is happening / broken / needs approval / attention today  

## Commits (Phase 2 execution order)

1. `feat(pmo): create project management foundation`  
2. `docs: add phase 2 real data integration plan`  
3. `feat(connectors): github connector v1`  
4. `feat(connectors): supabase connector v1`  
5. `feat(health): deterministic scoring service`  
6. `feat(dashboard): production metrics dashboard`  
7. `feat(chief-of-staff): daily briefing generator`  
