# Phase 5 Test Plan — Full executive team + cross-executive synthesis

Goal: verify the build, then exercise every executive + the Executive Team synthesis end-to-end. The test plan goes static → unit → integration → live data.

## 0. Prerequisites

- `.env.local` contains `ANTHROPIC_API_KEY`, `SUPABASE_*`, `AI_COMPANY_DATA_MODE=supabase`, and `ai_company` is in Supabase Exposed Schemas.
- Run from the repo root unless noted.

## 1. Static checks (under 60s, no infra needed)

```bash
# 1.1 Install
corepack pnpm install

# 1.2 Per-package typecheck (catches missing tsconfig path entries)
corepack pnpm -r typecheck

# 1.3 Build all workspace packages (catches composite project misconfig)
corepack pnpm -r build
```

**Expected:** All packages compile clean. If `typecheck` fails on the newer engines (`business-funnel-engine`, `decision-support-engine`, `financial-intelligence-engine`, `portfolio-intelligence-engine`, `project-registry`, `revenue-intelligence-engine`), they're likely missing entries in `tsconfig.base.json` paths and the root `tsconfig.json` references. Add them (mirror the existing entries) and retry.

## 2. Dashboard build

```bash
# 2.1 Type-only check on the app
corepack pnpm -C apps/executive-dashboard typecheck

# 2.2 Production build (this exercises Next 16 + Turbopack + transpilePackages)
corepack pnpm -C apps/executive-dashboard build
```

**Expected:** No `Module not found` or `Export X doesn't exist`. If Turbopack reports `.js` extensions in relative imports, see the prior remediation: strip `.js` extensions from intra-package relative imports in `packages/**/src/**/*.ts`.

## 3. CLI smoke (deterministic, no LLM key required)

Each executive CLI runs against `InMemoryRepositories` and the `Fake*LlmClient`. These should all print a JSON briefing.

```bash
corepack pnpm -C packages/ai-chief-of-staff   cli:briefing
corepack pnpm -C packages/ai-cto              cli:briefing
corepack pnpm -C packages/ai-coo              cli:briefing
corepack pnpm -C packages/ai-cfo              cli:briefing
corepack pnpm -C packages/ai-vp-marketing     cli:briefing
corepack pnpm -C packages/ai-vp-sales         cli:briefing
corepack pnpm -C packages/ai-executive-team   cli:digest
```

**Expected for each:** Single JSON object on stdout. Validation contracts (`ensure*Output`) throw if the shape is wrong, so a clean exit = the contract holds.

**Spot-check the Executive Team output specifically:**
- `executiveSnapshot[]` has 6 entries (one per executive). Each `health` field is either a `ProjectHealth` value or empty string (`""`) when that executive has no report.
- `convergentThemes[]` is non-empty after running other CLIs first, empty before (synthesis has nothing to read).
- `ceoOpenQuestions[]` mentions stale executives if you skip a CLI.

## 4. Dashboard runtime smoke (mock mode)

```bash
# 4.1 Force mock mode for a clean baseline
AI_COMPANY_DATA_MODE=mock corepack pnpm -C apps/executive-dashboard dev
```

Open <http://localhost:3000>. On first load `ensureSeededMockData()` runs the sync orchestrator. Verify each step:

1. **Overview tab** — 4 projects render, ~5 metrics each, risks/opportunities count > 0.
2. **AI Chief of Staff tab** → click **New daily briefing**. Expect a Claude-authored (or Fake) briefing in <10s.
3. Repeat for **CTO, COO, CFO, VP Marketing, VP Sales** — six independent briefings.
4. **Executive Team tab** → click **New board digest**. Expect:
   - `executiveSnapshot` shows 6 executives with real headlines (not "no report").
   - `convergentThemes` lists at least 1 entry (look for `lab-os` — it should show up since multiple executives flag it).
   - `tensions` may be empty in mock mode (CFO Fake rarely emits `reduce` here) — that's expected, not a bug.
   - `strategicMoves[].contributingExecutives` lists 2+ executive ids on at least one move.
5. **Reports tab** — 7 reports listed (6 individual + 1 board digest). Click each to see structured rendering.

## 5. Dashboard runtime smoke (Supabase mode)

```bash
AI_COMPANY_DATA_MODE=supabase corepack pnpm -C apps/executive-dashboard dev
```

Repeat the runtime smoke. Then verify persistence directly:

```sql
-- Run in Supabase SQL editor against the Foodtruck project.
select executive_id, report_type, count(*), max(created_at)
from ai_company.executive_reports
group by 1, 2
order by 1;
-- Expect: 7 distinct executive_ids, daily_briefing + ad_hoc rows.

-- Verify risk provenance varies by executive.
select source, count(*)
from ai_company.risks
group by 1
order by 2 desc;
-- Expect: connector:foodtruck-il, connector:lab-os, …, executive:cto,
-- executive:cfo, executive:coo, executive:vp-marketing, executive:vp-sales,
-- executive:chief-of-staff. The Executive Team is NOT a source — it never writes risks.
```

## 6. Real-connector smoke (FoodTruck-IL)

```bash
# 6.1 Sync only FoodTruck-IL
curl -X POST http://localhost:3000/api/connectors/sync \
  -H 'content-type: application/json' \
  -d '{"connectors":["foodtruck-il"]}'

# 6.2 Verify it pulled live counts (not mocks)
curl http://localhost:3000/api/projects | jq '.[] | select(.slug=="foodtruck-il")'
```

**Expected:** project metrics include `total_trucks`, `pending_trucks`, `events_last_7d`, `active_users_last_7d` — values matching what's actually in `public.trucks`, `public.truck_events` etc. Mock values are `active_trucks: 12, daily_revenue: 38420`; live values will look different.

## 7. Cross-executive synthesis — semantic checks

After a full briefing run with Claude (not Fake), verify these properties of the board digest:

1. **No invented facts.** Every `convergentTheme.affectedProjects` slug must appear in the platform's `projects` table. No `monorepo-prod-2` etc.
2. **Attribution is faithful.** Every `strategicMoves[].contributingExecutives` id must be one of: `chief-of-staff | cto | coo | cfo | vp-marketing | vp-sales`. Never `executive-team` itself.
3. **Tensions cite real positions.** Each `tensions[].parties[].position` should be a verb-shaped recommendation (`reduce`, `invest`, `monitor`, `high`, etc.), not a paragraph.
4. **Open questions are decisions, not summaries.** Each `ceoOpenQuestions[]` should be answerable with a choice/action. If they read like restatements of facts, the prompt needs sharpening.

## 8. Negative / robustness checks

| What | How | Expected |
|---|---|---|
| Missing executive report | Delete `repos.reports.latest('cto', 'daily_briefing')` row in Supabase, regenerate digest | `executiveSnapshot` includes CTO with empty `health` and `headline`. `ceoOpenQuestions` mentions stale report. |
| Connector failure | `AI_COMPANY_ACTIVE_CONNECTORS=foodtruck-il` only, restart, generate digest | Other projects show as "no recent data" in context; executives flag freshness. Should not throw. |
| Bad LLM JSON | Temporarily set `ANTHROPIC_MODEL=does-not-exist` | API route returns 500 with `BOARD_DIGEST_FAILED` and the underlying message; no orphaned rows in `executive_reports`. |
| Schema drift | `ALTER TABLE ai_company.risks ADD COLUMN x text` | Existing reads continue; `recordMany` insert continues since we don't list columns we don't write. |

## 8b. Cross-process synthesis gotcha (clarification)

Each CLI script (`pnpm cli:briefing` per executive) uses a **fresh `InMemoryRepositories`** instance, so reports written in one process are invisible to a different process. As a result:

- Running the six executive CLIs followed by `pnpm cli:digest` will produce an Executive Team digest with **0 convergent themes** and 6 "no report" rows in `executiveSnapshot`.
- Convergence requires a **shared** report store. Use one of:
  - **Dashboard** in mock mode (single Node process holds the in-memory store).
  - **Dashboard** in Supabase mode (reports are written to Postgres).
  - A single-process script that fans out across all executives.

This is by design — the in-memory store is process-scoped on purpose so CLI runs don't leak state. It's a documentation gap rather than a bug.

## 9. Performance budgets (manual eyeball)

| Action | Mock mode | Supabase + Claude (observed in last run) |
|---|---|---|
| First page load (cold) | < 60s (Turbopack compile) | < 60s |
| `Sync connectors` button | < 200ms | ~2.2s ✓ |
| Single executive briefing | < 1s (Fake) | **47–62s** (budget: < 8s) ⚠ |
| Board digest | < 1s (Fake) | **43–47s** (budget: < 12s) ⚠ |

**Investigation when executive briefings exceed budget:**
1. Check that `claude-sonnet-4-6` (not Opus) is being called — Opus is ~3× slower.
2. Verify `tool_choice: { type: 'tool', name: ... }` is set so the model doesn't think out loud first.
3. Confirm `max_tokens` isn't grossly oversized — the executive prompts cap at ~4k; raising further inflates latency.
4. The `CompanyContext` JSON-stringified into the prompt grows with metrics history. If it crosses 50KB, trim `listLatestByProject` to last 24h, not last 30d.
5. Network — if Anthropic regional endpoint is slow, try ANTHROPIC_BASE_URL override.

If the board digest exceeds 30s consistently, the input prompt is probably too large — trim `briefs[].recommendations` to <10 entries each in `buildExecutiveTeamInput()`.

## 10. Sign-off checklist

- [ ] `pnpm -r build` clean
- [ ] `pnpm -C apps/executive-dashboard build` clean
- [ ] All 7 CLI scripts produce valid JSON
- [ ] All 12 dashboard tabs render (Overview, Projects, Registry, Reports, CEO Command Center, CoS, CTO, COO, CFO, VP Marketing, VP Sales, Executive Team)
- [ ] All 7 briefings persist in Supabase
- [ ] Board digest shows convergence + at least one tension when CFO is asked first
- [ ] Real FoodTruck-IL connector returns live counts (`total_trucks`, `events_last_7d`, etc.) — not the mock 5-metric set
- [ ] Negative tests behave as expected
- [ ] VP Marketing validator tolerates missing `growthRisks` from Claude (regression: see §11)

## 11. Phase 5 extras — Command Center / CEO OS / Revenue / Financial / Registry / Health Score

Newer surface area not covered by §4–5. Run these after the executive team checks pass.

### 11.1 Command Center (`/ceo`)
- Visit <http://localhost:3000/ceo>. The page should render directives, decisions, and an action queue.
- Check API roundtrips:
  ```bash
  curl http://localhost:3000/api/ceo/decisions
  curl http://localhost:3000/api/ceo/directives
  ```
  Expected: 200 JSON. Empty arrays acceptable on a fresh DB.
- Issue a directive via `POST /api/ceo/directives` and confirm it appears on the page after refresh.

### 11.2 Daily brief endpoint
- `curl -X POST http://localhost:3000/api/chief-of-staff/daily-brief` should return a payload that includes `ceoDirectives` and `openCeoDecisions` (CEO OS fields wired into the brief).

### 11.3 Registry (`/registry`)
- Visit <http://localhost:3000/registry>. Lists project definitions.
- `curl http://localhost:3000/api/registry/projects` returns project rows from `project_definitions` (or wherever the registry stores them).

### 11.4 Revenue intelligence
- `curl http://localhost:3000/api/metrics/foodtruck-business` → live registry-shaped revenue counts (not connector sync metrics).
- The CFO briefing should now ingest these signals if the revenue intelligence engine is hooked into `buildCompanyContext`.

### 11.5 Financial intelligence
- After running CFO briefing, verify `cashSnapshot.estimatedRunwayMonths` is populated when the financial-intelligence-engine has data; otherwise `commentary` should explain the absence.

### 11.6 Health score
- `curl http://localhost:3000/api/health/score` returns per-project health rollups computed by the `health-score` package.
- Cross-check the dashboard Overview tab — health badges should match the API response.

### 11.7 Funnel / GitHub / Supabase metrics
- `curl http://localhost:3000/api/metrics/funnel`
- `curl http://localhost:3000/api/metrics/github`
- `curl http://localhost:3000/api/metrics/supabase`

Each should return a structured payload (possibly empty until those connectors are wired live). Treat 500 as a real failure; treat 200 + empty array as "connector not yet active".

### 11.8 Portfolio intelligence
- `curl http://localhost:3000/api/portfolio/intelligence` exercises the portfolio-intelligence-engine. Expected: top-of-portfolio rollup with cross-project rankings.

### 11.9 Decision support actions
- `curl http://localhost:3000/api/decision-support/actions` returns the decision-support-engine's queued actions for the CEO. Should reflect items synthesized from executive risks/opportunities.

### 11.10 Engine package builds (sanity)
- `corepack pnpm -C packages/business-funnel-engine build`
- `corepack pnpm -C packages/decision-support-engine build`
- `corepack pnpm -C packages/portfolio-intelligence-engine build`
- `corepack pnpm -C packages/project-registry build`
- `corepack pnpm -C packages/revenue-intelligence-engine build`
- `corepack pnpm -C packages/financial-intelligence-engine build`

All should exit 0. If any fails on missing `tsconfig.base.json` path entry or root `tsconfig.json` reference, add them (mirror existing executive entries).

## 12. Diagnosing the FoodTruck mock-mode trap

If `/api/connectors/sync` writes the 5-metric mock set (`active_trucks`, `daily_revenue`, …) instead of the live 9-metric set (`total_trucks`, `events_last_7d`, …):

1. Set `AI_COMPANY_LOG_CONNECTOR_MODE=1` in `.env.local` and restart. The server logs `[platform] FoodTruck-IL connector: live | mock` on first request — that tells you which path was constructed.
2. Confirm `.env.local` doesn't have `FOODTRUCK_SUPABASE_URL=` empty (no value after `=`). If it's empty, either remove the line or set it to the Foodtruck project URL. `platform.ts` now uses `||` (not `??`) so an empty string falls back to `NEXT_PUBLIC_SUPABASE_URL`, but having an explicit value avoids ambiguity.
3. If you ever see "mock" logged with `url=set, key=set`, that's an actual bug — open it.

## 13. Validator regression note

VP Marketing previously failed with `VpMarketingOutput: missing field "growthRisks"` when Claude omitted that array. As of this revision, all six executive validators (CoS / CTO / COO / CFO / VP Marketing / VP Sales) plus the Executive Team synthesis validator default missing array fields to `[]` and only throw on missing scalars (`headline`, the `*Health` field). This means Claude can legitimately emit a briefing with no growth risks, no tech debt items, no tensions, etc., and the API route will persist a clean report instead of 500-ing.

Reproduce the fix is in place:
```bash
node -e "
  const { ensureVpMarketingOutput } = require('@ai-company/ai-vp-marketing');
  console.log(ensureVpMarketingOutput({
    headline: 'test',
    marketingHealth: 'healthy',
    perProjectMarketing: [],
    campaignIdeas: [],
    marketingPriorities: [],
    // growthRisks deliberately omitted
  }));
"
```
Expected: prints the parsed object with `growthRisks: []`, no throw.
