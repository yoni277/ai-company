# Zero-State Acceptance Test — 2026-06-06

Goal: prove the AI-Company OS boots, renders, and operates as a **generic** OS with zero projects, with **no hardcoded business assumptions**. Run after the runtime reset (see `RESET_VALIDATION_REPORT.md`).

## Method note
Tests A–D require the **running** dashboard and live executives. The agent environment cannot reach them (sandbox has no Supabase network; the Vercel deploy is behind SSO + Basic-Auth). They are marked **PENDING (operator)** with a static prediction. **Test E (hardcoded-assumption scan) was run in full** and is the gating result below.

---

## Test E — Hardcoded business assumptions (RUN — **FAIL**)

Scanned all source (`*.ts/tsx/js/mjs/json/sql`, excluding `node_modules`, build output, lockfiles) for `foodtruck`, `lab-os`, `inventory-engine`, `whatsapp-engine`.

### Legitimate (instance layer — NOT leaks)
- `instances/**`, top-level `connectors/{foodtruck-il,lab-os,inventory-engine,whatsapp-engine}/**` — the instance/connector layer is allowed to name businesses.
- `supabase/migrations/instance/**` — all business-row seeds (`0002/0004/0006/0008`) live under `instance/`; README states they belong to "this company's portfolio." A clone does not run them. **Correctly separated.**
- `packages/doos-core/tests/**` — sample slug strings in test fixtures.
- `apps/.../lib/platform.ts`, `packages/ai-chief-of-staff/src/daily-brief.ts` — *guard comments* telling future devs NOT to import connectors. Not leaks.
- `scripts/register-project.mjs` — `foodtruck-il` only in a usage example comment.

### P0 — Active leaks in the GENERIC layer (fire on a clean clone)
1. **`apps/executive-dashboard/app/page.tsx`** — the `/` overview page **unconditionally** calls `loadFoodTruckBusinessMetrics()` and renders `<OwnerAcquisitionPanel metrics={foodTruck.metrics} />` on every load, with no project guard. A zero-project clone renders FoodTruck owner-acquisition UI instead of a clean empty state. **This is the most important leak — it directly breaks Test A/B.**
2. **`apps/executive-dashboard/lib/owner-acquisition.ts`** — imports `@ai-company/connector-foodtruck-business` and is wired into the generic overview page (above). The file's own comment claims "instance layer," but it is consumed unconditionally by the platform overview route.
3. **`packages/project-registry/src/supabase-store.ts`** — `hasFoodTruckCredentials()` + `liveCapable: connectorType === 'foodtruck-business' && …` bakes a specific connector type and FoodTruck env vars into a **generic** package's runtime read path.
4. **`apps/executive-dashboard/app/api/metrics/foodtruck-business/route.ts`** — a project-specific API endpoint shipped in the platform app.
5. **`apps/executive-dashboard/lib/phase2-metrics.ts`** — `if (p.slug !== 'foodtruck-il') continue;` in `collectPendingApprovals` (harmless at zero projects; wrong for any other instance).

### P1 — Contract / UI / packaging leaks
6. **`packages/shared-types`** — `FoodTruckBusinessMetrics` type (`business.ts`) and the `foodTruck?` field on `DailyBriefMetricsInput`/`Phase2` (`phase2.ts`), already marked `@deprecated` / L1-migration.
7. **Dashboard UI components** — `OwnerAcquisitionPanel.tsx`, `command-center/WeeklyGoalsWidget.tsx`, `command-center/CeoOperatingSystemPanels.tsx`, `command-center.ts`, `TaskEvidencePanel.tsx` carry FoodTruck-specific copy/logic.
8. **`packages/connectors/foodtruck-business/`** — an instance connector physically located in the platform `packages/` tree (boundary smell; tolerable only while nothing generic imports it — but #1/#2 do).

> Several of these are already tracked in `GENERIC_PLATFORM_REFACTOR_PLAN.md` (L1, L8). They remain present in code, so per the directive ("treat every remaining hardcoded business reference as a P0 bug") they are listed here as open.

---

## Tests A–D — static prediction (PENDING live operator confirmation)

- **Test A — `/` overview:** Likely **renders without 500** (FoodTruck connector falls back to empty/mock when `FOODTRUCK_SUPABASE_URL` is unset, and all repo reads are empty-safe), **but it will NOT show a clean project-agnostic empty state** — it renders the FoodTruck `OwnerAcquisitionPanel` (leak #1). Expectation "clean empty state / no FoodTruck references" → **FAIL** on current code.
- **Test B — `/ceo/directives`:** List read is empty-safe (`(data ?? [])`); create path doesn't require projects. Expect empty list + create works. "No FoodTruck references" depends on the page; needs visual confirmation.
- **Test C — executives (`/executive-team`, not `/executives`):** Executives are constructed in `platform.ts` independent of runtime data; expect them to render with no project data. Low crash risk.
- **Test D — run a directive with zero projects:** Create/enqueue path (`POST /api/ceo/directives` → queue) has no project dependency. Whether executives gracefully say "no registered projects" is an LLM-runtime behavior that **must be observed live** — cannot be asserted statically.

---

## Recommendation

**Do NOT register a project yet** — agreed. The reset and DB-level empty state are clean, but Test E shows the **dashboard overview route is not project-agnostic** (leak #1/#2). Registering FoodTruck now would re-hide exactly this. Suggested order:

1. Fix P0 #1/#2: make the overview page render owner-acquisition/FoodTruck panels **conditionally** (instance-declared widgets), not unconditionally.
2. Fix P0 #3: move FoodTruck-credential/connector-type logic out of `packages/project-registry` into the instance/connector config.
3. Re-run Test E (expect zero generic-layer hits) and confirm Tests A–D live.
4. Only then `cli:register-project --slug acme-test …` + `cli:seed-instance`, and verify metrics/risks/opportunities appear.

---

## P015A — Generic Platform Leak Cleanup (executed 2026-06-06)

All fixes below typecheck clean (`tsc --noEmit` on the dashboard app + `shared-types`, `connector-foodtruck-business`, `ai-chief-of-staff`, `project-registry`) and the existing `scripts/audit-leaks.mjs` gate PASSES.

**Done (verifiable offline):**
1. **Generic render path (`app/page.tsx`)** — no longer imports or calls `loadFoodTruckBusinessMetrics()` and no longer renders `OwnerAcquisitionPanel`; the deprecated `foodTruck`/`acquisitionSummary` brief fields were dropped. The `/` route makes **no FoodTruck connector call** at render.
2. **`lib/phase2-metrics.ts`** — removed the FoodTruck import, the `loadDailyCeoBrief` FoodTruck fields, and the hardcoded `if (p.slug !== 'foodtruck-il')` pending-approvals block.
3. **`/api/metrics/foodtruck-business`** — disabled (returns 404), FoodTruck import removed.
4. **`packages/project-registry/src/supabase-store.ts`** — removed `hasFoodTruckCredentials()` and `connectorType === 'foodtruck-business'`; `liveCapable` is now a generic, config-driven flag (`resolveLiveCapable`).
5. **`packages/shared-types`** — the `FoodTruck*` metric types were moved out of the generic package into the connector (`connector-foodtruck-business/src/types.ts`); the `business` re-export and the deprecated `foodTruck?` field were removed; committed `.d.ts` artifacts were updated to match.
6. **Dashboard UI** — `WeeklyGoalsWidget` (goals now an instance-supplied prop, empty by default), `CeoOperatingSystemPanels` (project dropdown now fed from the live registry via a `projectOptions` prop, no hardcoded slugs), `command-center.ts` (generic `topRiskLabel`, dropped `inactiveApprovedTrucks`/truck parsing), `CommandCenterView` (generic hint), and `TaskEvidencePanel` placeholders are now business-agnostic.

**Test E result:** the official pattern (`foodtruck|lab-os|inventory-engine|whatsapp-engine`) now returns **zero executable references** in the generic layer. The only remaining matches are two intentional guard comments (`lib/platform.ts`, `ai-chief-of-staff/daily-brief.ts`) that instruct developers NOT to import those connectors — explicitly permitted by the project's `audit-leaks` doctrine.

**Residual — requires a full toolchain (cannot be completed in the agent sandbox):**
- **`pnpm install` is blocked here (EPERM on the mounted FS)** and **file deletion/rename is blocked**, so:
  - `packages/connectors/foodtruck-business/` remains physically under `packages/` (connector-layer code; excluded from the generic scan per directive #8). To finish directive #8, `git mv packages/connectors/foodtruck-business connectors/foodtruck-business`, add it to `instances/yoni-company/package.json`, and run `pnpm install` on a normal checkout.
  - Orphaned stubs left empty (pending `git rm`): `apps/.../lib/owner-acquisition.ts`, `apps/.../components/OwnerAcquisitionPanel.tsx`, `apps/.../app/api/metrics/foodtruck-business/route.ts`, `packages/shared-types/src/business.ts` + `business.d.ts`.
  - `.d.ts` files were hand-edited to match; a real `tsc -b` build will regenerate them.
- **Recommended follow-up:** extend `scripts/audit-leaks.mjs` with a business-slug guard (allowlisting `connectors/`, `instances/`, comments) so this cannot regress in CI.
- **Out of scope (separate leak, L13):** `app/ceo/page.tsx` still contains hardcoded Hebrew UI strings — a language-neutrality leak, not a business-slug leak.

**Status:** the generic platform's **runtime + type surface is now business-agnostic and verified**; the zero-project dashboard no longer invokes any FoodTruck code. P015 (Test E) generic-layer gate is **PASS**; the packaging/file-deletion residuals above are mechanical and need a normal git/pnpm environment.

---

## Live zero-state validation (Tests A/B) — executed 2026-06-06 against the running dev server

Run against the live `next dev` server (port 3000) reading the real (reset) Supabase, driven via the browser. Registry set to **active = 0** (foodtruck-il `enabled=false`, reversible) + runtime `projects = 0`.

### CRITICAL FINDING + FIX — registry empty-state fallback (the most important catch of the whole exercise)
The first live load of `/` with an empty registry still rendered **full FoodTruck-IL** content (funnel 27/26/10, revenue ₪14,386, portfolio "1 project · FoodTruck-IL", a CEO action queue about "approved trucks"). Root cause was **not** a P015A leak — it was `ProjectRegistryService.loadProjects()` in `packages/project-registry/src/index.ts`:

```
const projects = await loadRegistryFromSupabase(...);
if (projects.length > 0) return { projects, source: 'database' };
// fell through on empty ↓
return { projects: buildInMemoryRegistrySeed(), source: 'in-memory' };  // instance seed (foodtruck-il)
```

An **empty-but-successful** DB read fell through to the instance seed, so the platform **could not represent zero projects** in supabase mode — a fresh clone would resurrect the previous company's seed. This is the registry-layer analogue of the P006B boot-time auto-seed. **Fix:** a successful read is authoritative including empty; the seed fallback now fires only in the `catch` (tables unreadable/not migrated). Typecheck clean.

### Test A — dashboard with zero projects: **PASS** (after the fix + hot reload)
- `/` Overview: "0 live projects", "No portfolio projects configured for intelligence aggregation", "Revenue data not available", ₪0 across revenue/financial, "No projects yet", "No briefing yet". **No FoodTruck content.**
- `/projects`: no project rows + a correct generic diagnostic ("1 connector referencing unregistered project slug foodtruck-il — sync is skipping until you register it"). Data-driven instance-connector visibility, not a hardcoded leak; also demonstrates explicit-registration gating.
- `/ceo`: project dropdown = "All portfolio" only (no hardcoded slugs), "This week's goals: No goals set", "TOP RISK: No risks flagged", "0 active directives". Clean.
- `/executive-team`: "No board digest yet." Clean.
- No 500s / null-reference crashes on any route.
- (Separate, non-business leak noted: `/ceo` still has hardcoded Hebrew header strings — L13 language neutrality.)

### Test B — create a directive at zero projects + run executive: **PASS**
- Created directive "Validate Generic Platform" → "Analyze the current company state and provide recommendations." (Chief of Staff), drained the response queue (live LLM).
- Chief of Staff report headline: *"Company portfolio is empty — no active projects exist…"*; `perProject: []`; business-term regex match = **false** (no FoodTruck/truck/etc.).
- **No silent mutation:** DB delta was exactly `ceo_directives +1`, `directive_responses +1`, `executive_reports +1`. projects/metrics/risks/opportunities/tasks/proposals/objectives/decisions/data_sources all remained **0**.

### Conclusion
**Cloneability = Verified at zero-state runtime.** The OS boots, renders every core page, accepts a directive, and runs an executive with zero projects and zero business data — producing correct empty-state output and no FoodTruck assumptions, after the P015A code cleanup **and** the registry empty-state fix above.

**State note:** registry row remains `enabled=false` (reversible); the Test B directive/response/report remain in the DB as evidence (removable via `scripts/runtime-reset/reset.sql`). Next: Test D (explicit `cli:register-project generic-test` + `cli:seed-instance`), then decide P015B.
