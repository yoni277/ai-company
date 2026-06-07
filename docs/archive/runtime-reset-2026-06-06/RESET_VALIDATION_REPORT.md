# CEO Directive — Full Runtime State Reset & Empty-System Validation

**Date:** 2026-06-06
**Priority:** P0
**Target:** Supabase project `wimsglxixekmjsfpnqjb`, schema `ai_company`
**Authorized scope:** Full business-data wipe; **keep** the project registry (`project_definitions`, `project_funnel_stages`, `project_connector_configs`) as "connectors / platform configuration" per Rule 3.

---

## 1. Backup Report

**Export location (primary, authoritative):** in-database snapshot schema **`ai_company_backup_20260606`** — a complete, restorable copy of every runtime table, created additively (no source table touched). Snapshot integrity was verified row-for-row equal to source for all 20 tables before deletion.

**Export location (repo):** `docs/archive/runtime-reset-2026-06-06/`
- `pre-reset-counts.json` — counts + scope manifest
- `RESET_VALIDATION_REPORT.md` — this report
- `../../scripts/runtime-reset/reset.sql` — the single reset script (Rule 2)
- `../../scripts/runtime-reset/restore.sql` — restore from the snapshot schema
- `../../scripts/runtime-reset/export-backup.mjs` — re-runnable on-disk JSON export (run from a host with Supabase network access; the agent sandbox had none)

> Note on file-level JSON export: the agent sandbox has no network route to Supabase, and the full row data (notably `executive_reports`, 546 KB) exceeds the tool result limit, so per-table `.json` files were not written from the sandbox. The verified in-DB snapshot is the authoritative backup; `export-backup.mjs` reproduces the on-disk copy when run on the user's machine.

**Table counts before reset:**

| Table | Rows before | Action |
|---|---|---|
| projects | 1 | deleted |
| project_metrics | 36 | deleted |
| risks (`project_risks`) | 5 | deleted |
| opportunities (`project_opportunities`) | 2 | deleted |
| ceo_directives | 23 | deleted |
| directive_responses | 18 | deleted |
| task_proposals | 12 | deleted |
| tasks | 2 | deleted |
| evidence_tokens | 3 | deleted |
| task_outcomes | 1 | deleted |
| executive_reports | 59 | deleted |
| report_links | 0 | deleted |
| objectives | 1 | deleted |
| objective_outcomes | 0 | deleted |
| data_sources | 1 | deleted |
| ceo_decisions | 1 | deleted |
| revenue_transactions | 0 | deleted |
| **project_definitions** | 1 | **kept (registry)** |
| **project_funnel_stages** | 3 | **kept (registry)** |
| **project_connector_configs** | 1 | **kept (registry)** |

**`executive_scorecard_snapshots`:** named in the directive but **does not exist** in the schema. No action possible; noted, not a defect.

---

## 2. Reset Report

Executed as one transactional migration `runtime_reset_20260606_full_wipe_keep_registry` (Rule 2: single, auditable, repeatable). Deletion order honoured child-before-parent against live foreign keys (Rule 4). Rows deleted equal the pre-reset counts above:

```
task_outcomes 1 · evidence_tokens 3 · tasks 2 · task_proposals 12 ·
report_links 0 · directive_responses 18 · executive_reports 59 ·
ceo_directives 23 · objective_outcomes 0 · objectives 1 ·
project_metrics 36 · risks 5 · opportunities 2 · data_sources 1 ·
ceo_decisions 1 · revenue_transactions 0 · projects 1
TOTAL: 165 rows deleted across 17 tables.
```

---

## 3. Empty-State Verification Report

### Phase A — Row counts (PASS)
Post-reset counts confirmed via SQL:

```
projects=0  project_metrics=0  risks=0  opportunities=0
ceo_directives=0  directive_responses=0  task_proposals=0  tasks=0
evidence_tokens=0  task_outcomes=0  executive_reports=0  report_links=0
objectives=0  objective_outcomes=0  data_sources=0  ceo_decisions=0
revenue_transactions=0
project_definitions=1  project_funnel_stages=3  project_connector_configs=1  [KEPT — registry]
```
All directive-enumerated tables = 0. The three non-zero tables are the intentionally-retained project registry (in-scope per the confirmed decision).

### Phases B / C / D — verification method
The agent environment cannot exercise the live UI: the sandbox has **no network route to Supabase** (so the dashboard cannot boot against the real DB here), and the production Vercel deployment is behind **Vercel SSO + the app's own HTTP Basic-Auth middleware** (so its API cannot be fetched without credentials). These phases were therefore verified by **static analysis of the read/render and API paths** plus the **DB-level empty state** above. Findings:

**Phase B — Dashboard / no auto-seed (PASS, static):**
- `ensureSeededMockData()` was removed (`apps/executive-dashboard/lib/platform.ts:228`); the comment documents that "runtime page renders are now pure reads" and an `audit-leaks` gate fails the build if a seed function reappears.
- No write call (`.insert/.upsert/.update/.delete`) exists in any `app/**/page.tsx` render file.
- In **supabase mode** (the active `AI_COMPANY_DATA_MODE=supabase`), `createRepositories` returns the Supabase repositories and **never constructs** the in-memory store — so the only `ensureSeed()` in the codebase (in-memory mock mode) is unreachable in production. The instance `mockSeed` is ignored in supabase mode.

**Phase C — APIs return empty collections, not 500s (PASS, static):**
- List endpoints (`/api/projects`, `/api/ceo/directives`, `/api/tasks`, `/api/objectives`, `/api/reports`, …) call repository `list*()` methods that all end in `return (data ?? []).map(...)` — i.e. they yield `[]` on zero rows. `.single()` is used only on get-by-id / insert / update paths, never on list reads.
- Handlers are wrapped in `try/catch` returning structured JSON; an empty table yields a `200` with an empty array/collection.

**Phase D — No silent mutation (PASS, static):**
- No `.insert/.upsert` in any `app/api/**/route.ts`; all writes route through the repository layer and are reachable only from explicit `POST` handlers, never from `GET`/render.
- Module-load side effects in `platform.ts` are registrations only (responders, registry seed registration, metadata) — no row creation.

> **Live runtime confirmation of B/C/D (UI render + actual HTTP status codes) is still recommended** and requires running the dashboard on a host with Supabase access (or providing deployment credentials). See "Outstanding" below.

---

## 4. Registration Report (Phase E) — PENDING operator action

By doctrine (D023/D038) project registration is a deliberate, explicit step run against the live platform; the directive requires the approved path and forbids manual inserts. The agent sandbox cannot run the CLI (no Supabase network) and must not bypass it via SQL. Command to run on the platform host:

```bash
pnpm cli:register-project \
  --slug <slug> --name "<Name>" --status healthy \
  --description "<desc>" --createdBy ceo
```

Expected: `projects = 1`, `created_by` stamped (`ceo`), and **no** rows auto-created in any other table. The agent will verify the resulting DB state via the database connector immediately after.

## 5. Seed Report (Phase F) — PENDING operator action

`cli:seed-instance` is HTTP-backed: it POSTs `/api/connectors/sync` to a **running** dashboard. Run from the platform host:

```bash
corepack pnpm dev           # terminal 1 — start dashboard
pnpm cli:seed-instance      # terminal 2 — explicit seed
```

Expected: only this explicit action creates state; metrics / risks / opportunities populated; per-connector `ok` status and duration reported. The agent will verify created-row deltas via the database connector afterward.

---

## 6. Findings & Conclusion

**Defects found:** none affecting empty-state operation.

**Doctrine observation (not an empty-state blocker):** `apps/executive-dashboard/lib/phase2-metrics.ts` contains a hardcoded instance slug — `if (p.slug !== 'foodtruck-il') continue;` inside `collectPendingApprovals`. It is harmless at zero projects (the loop body never runs), but it is a generic-platform leak (a project slug baked into the dashboard lib layer) and should move to the instance layer for cloneability.

**Conclusion (interim):**
> **PASS** for the database reset and the empty-state validation that can be verified without the running platform: the runtime database is clean, the registry is intact, and the code paths prove there is **no auto-seed and no silent-mutation path**, with all list APIs returning empty collections rather than crashing.
>
> **Not yet executed:** Phases E and F (explicit registration + explicit seed) and a live UI/HTTP confirmation of B/C/D — all require running the platform on a host with Supabase access. Commands are prepared; the agent will verify resulting DB state once they are run. **No FAIL conditions were discovered.**

**Restore path if needed:** `scripts/runtime-reset/restore.sql` (re-inserts every table from `ai_company_backup_20260606` in parent-before-child order).
