# Generic Platform Refactor Plan

**Status:** plan only — no refactor in this pass
**Companion:** `docs/architecture/GENERIC_PLATFORM_BOUNDARY.md`
**Date:** 2026-06-03

---

## How to read this plan

Each leak is a place where instance-specific data (project slugs, vendor names, regional terms, instance-only imports) lives inside the platform layer. For each, the plan records:

- **Where** — file + line ranges, with exact symbols.
- **Why it leaks** — what makes it instance-specific.
- **Severity** — `Critical` / `High` / `Medium` / `Low`.
- **Target** — where this code or data should live after refactor.
- **Migration steps** — concrete, in order. Reversible where possible.
- **Acceptance test** — observable proof the refactor preserved behaviour.

The plan is ordered to minimise churn: bottom-up (data → fixtures → executive prompts → wiring → dashboard) so each step lands on a stable base.

---

## Leak inventory

### L1. `packages/ai-chief-of-staff/src/daily-brief.ts` imports `@ai-company/connector-foodtruck-business`

**Severity:** Critical
**Why it leaks:** The Chief of Staff package — the *most* generic of the executives — directly imports a project-specific connector and calls `buildOwnerAcquisitionSummary(m.foodTruck)`. The CoS is supposed to consume only the generic `CompanyContext`. Cloning to AcmeCo means deleting an import inside the platform.

**Evidence:**
```
packages/ai-chief-of-staff/src/daily-brief.ts:8
  import { buildOwnerAcquisitionSummary } from '@ai-company/connector-foodtruck-business';
packages/ai-chief-of-staff/src/daily-brief.ts:128
  if (!m.foodTruck) return 'Owner acquisition: not available.';
packages/ai-chief-of-staff/src/daily-brief.ts:135
  if (!m.foodTruck) return 'Owner acquisition metrics not available.';
```

**Target:** Move the owner-acquisition path into a generic concept. Either:
- (a) introduce an `OwnerAcquisitionSummary` extension point on `DailyBriefMetricsInput` that any connector can populate via the instance config, OR
- (b) move `buildOwnerAcquisitionSummary` invocation up into the dashboard's `/api/chief-of-staff/daily-brief` route (instance layer, where it's free to import `connector-foodtruck-business`), and have the brief generator consume only the resulting summary string.

Option (b) is cheaper and preserves CoS as truly generic.

**Migration steps:**
1. Move the `buildOwnerAcquisitionSummary` call from `packages/ai-chief-of-staff/src/daily-brief.ts` up to the dashboard's daily-brief route handler.
2. Change `DailyBriefMetricsInput.foodTruck` to a generic `ownerAcquisitionSummary?: string` field (or rename to something neutral like `acquisitionSummary`).
3. Update `formatOwnerAcquisitionSummary()` and `formatOwnerAcquisitionDetail()` to read the pre-computed string.
4. Remove the `@ai-company/connector-foodtruck-business` workspace dep from `packages/ai-chief-of-staff/package.json`.
5. Update the system prompt in `EXPLAIN_ONLY_SYSTEM` and `buildExplainPrompt` to refer to a generic "acquisitionSummary" key.

**Acceptance test:**
- Existing `POST /api/chief-of-staff/daily-brief` response payload is byte-identical for the current instance.
- `grep -l 'connector-foodtruck' packages/ai-chief-of-staff` returns no matches.
- Unit test: brief generation with `acquisitionSummary: 'X trucks live, Y pending owner verification'` produces the same `ownerAcquisitionSummary` field as today.

---

### L2. `packages/ai-coo/src/fake-llm-client.ts` hardcodes `PROJECT_VENDORS` by slug

**Severity:** High
**Why it leaks:** Generic COO inference logic maps `foodtruck-il → Wolt`, `lab-os → LIMS integrations`, `whatsapp-engine → Meta WhatsApp Cloud API`, `inventory-engine → Connected consumer services`. The COO at AcmeCo would surface "Wolt" as a vendor for a company that doesn't use Wolt.

**Evidence:**
```
packages/ai-coo/src/fake-llm-client.ts:22-28  PROJECT_VENDORS hardcoded map
packages/ai-coo/src/fake-llm-client.ts:15     pattern regex includes 'trucks?|labs?' keywords
```

**Target:** Project metadata. The vendor list and metric hints should live on each project's record in `project_definitions` (or `CompanyContext.projects[i].vendors`), populated from the instance config / seed.

**Migration steps:**
1. Add `vendors?: Array<{ name: string; metricHint?: string }>` to `Project` in `@ai-company/shared-types`.
2. Add a column or JSONB field to `ai_company.project_definitions` to store vendor lists. Add it to the platform schema migration (new `0010_project_vendors.sql`).
3. Wire the instance seed (`0006_seed_project_registry.sql`) to populate vendors per project.
4. Update `buildCompanyContext` to include `vendors` per project.
5. Remove `PROJECT_VENDORS` from `fake-llm-client.ts`. Build vendor health from `context.projects[i].vendors` only.
6. Remove `trucks?|labs?` keywords from the throughput regex; use generic terms only (`throughput|orders?|events?|active|count|rate`).

**Acceptance test:**
- A COO briefing run for the current instance produces a vendor list that matches today (because `vendors` is seeded with the same values).
- A COO briefing run for an empty `vendors` array produces a report with `vendorHealth: []` rather than hallucinating vendors.
- `grep -i 'wolt\|lims\|meta whatsapp' packages/ai-coo` returns no matches.

---

### L3. `packages/ai-vp-marketing/src/fake-llm-client.ts` hardcodes `PROJECT_CHANNEL_HINTS` by slug

**Severity:** High
**Why it leaks:** Generic VP Marketing maps `foodtruck-il → whatsapp/push/social/partnership`, `lab-os → email/partnership/organic`, etc. AcmeCo's projects would inherit FoodTruck's channel preferences.

**Evidence:**
```
packages/ai-vp-marketing/src/fake-llm-client.ts:22-27  PROJECT_CHANNEL_HINTS hardcoded map
packages/ai-vp-marketing/src/fake-llm-client.ts:14  stageFor regex includes 'truck|lab|consumer' keywords
```

**Target:** Same as L2 — move to project metadata.

**Migration steps:**
1. Add `marketingChannels?: MarketingChannel[]` to `Project` in `@ai-company/shared-types`.
2. Seed it via the instance migrations.
3. Replace `defaultChannel(slug)` lookup with `context.projects[i].marketingChannels?.[0] ?? 'product'`.
4. Remove `truck|lab|consumer` from `stageFor` — use only neutral verbs (`signup|install|new_user|acquisition`).

**Acceptance test:**
- VP Marketing briefing for the current instance: campaign channels match today's hints.
- VP Marketing briefing with empty `marketingChannels` falls back to `'product'` for all projects.
- `grep -i 'foodtruck\|lab-os' packages/ai-vp-marketing` returns no matches.

---

### L4. `apps/executive-dashboard/lib/platform.ts` imports four connectors by name

**Severity:** High
**Why it leaks:** The dashboard's platform wiring imports `FoodTruckIlConnector`, `LabOsConnector`, `InventoryEngineConnector`, `WhatsAppEngineConnector` directly. To clone, an instance must edit this platform-layer file.

**Evidence:**
```
apps/executive-dashboard/lib/platform.ts:29-32
  import { FoodTruckIlConnector } from '@ai-company/connector-foodtruck-il';
  import { LabOsConnector } from '@ai-company/connector-lab-os';
  import { InventoryEngineConnector } from '@ai-company/connector-inventory-engine';
  import { WhatsAppEngineConnector } from '@ai-company/connector-whatsapp-engine';
```

**Target:** A single instance-supplied entrypoint. Create `instance/connectors.ts` (instance layer) that exports `registerInstanceConnectors(registry, env)`. `platform.ts` calls that one function and never knows which connectors exist.

**Migration steps:**
1. Create `instance/connectors.ts` with `export function registerInstanceConnectors(registry: ConnectorRegistry, env: NodeJS.ProcessEnv): void` containing the four `registry.register(...)` calls.
2. Delete those four named imports and the related construction logic from `platform.ts`.
3. Replace with a single `registerInstanceConnectors(registry, process.env)` call.
4. Move the `foodTruckUrl`/`foodTruckKey` env wiring inside `registerInstanceConnectors` — it's instance concern.
5. Delete the four `@ai-company/connector-*` workspace deps from `apps/executive-dashboard/package.json`. The instance pulls them in.

**Acceptance test:**
- `POST /api/connectors/sync` produces the same connector list and same per-connector results.
- `grep -E 'foodtruck|lab-os|inventory-engine|whatsapp-engine' apps/executive-dashboard/lib/platform.ts` returns zero matches.

---

### L5. `apps/executive-dashboard/package.json` lists instance connectors as workspace deps

**Severity:** Medium
**Why it leaks:** The dashboard package directly depends on connector packages that belong to the instance. Co-located workspace deps work today but couple the dashboard's build manifest to *this* instance.

**Evidence:**
```
apps/executive-dashboard/package.json
  "@ai-company/connector-foodtruck-il": "workspace:*",
  "@ai-company/connector-lab-os": "workspace:*",
  "@ai-company/connector-inventory-engine": "workspace:*",
  "@ai-company/connector-whatsapp-engine": "workspace:*",
```

**Target:** Pull these into a per-instance package (e.g. `instance/`) or rely on the instance to register them at runtime so the dashboard package has zero instance deps.

**Migration steps:**
1. Falls out of L4 step 5 — the same edit. Remove the four lines.
2. Verify `pnpm install` still resolves the connector packages because they're consumed by `instance/connectors.ts` (which becomes a thin entry point that holds the deps).

**Acceptance test:**
- `apps/executive-dashboard/package.json` lists only generic deps.
- `pnpm -C apps/executive-dashboard build` succeeds.

---

### L6. `packages/database/src/in-memory-repositories.ts` seeds the four projects in `ensureSeed()`

**Severity:** High
**Why it leaks:** Demo / mock mode of the platform assumes this company exists.

**Evidence:**
```
packages/database/src/in-memory-repositories.ts:41-66
  // hardcoded projects array with foodtruck-il, lab-os, inventory-engine, whatsapp-engine
```

**Target:** `InMemoryRepositories` constructor takes an optional `seedProjects` argument. The instance passes its `company.config.ts` projects. Platform-only tests use `[]`.

**Migration steps:**
1. Add `constructor(opts?: { seedProjects?: Array<Pick<Project, 'slug'|'name'|'description'|'status'>> })`.
2. Move the current hardcoded array out of the class file; either deletion (replaced by empty default) or move to instance-layer.
3. Update `createRepositories({ dataMode: 'mock' })` in `client.ts` to accept and forward `seedProjects`.
4. In the dashboard, pass instance seed from `company.config.ts` into `createRepositories`.

**Acceptance test:**
- Mock-mode dashboard for the current instance still shows the four projects.
- A test instantiating `new InMemoryRepositories()` (no args) has zero seeded projects.
- `grep -E 'foodtruck-il|lab-os|inventory-engine|whatsapp-engine' packages/database/src/` returns zero matches.

---

### L7. Seed migrations contain hardcoded project slugs

**Severity:** High
**Why it leaks:** Migration files are part of the platform's deployable schema artifacts. Today, instance-specific INSERTs are interleaved with platform-required tables.

**Evidence:**
- `supabase/migrations/0002_seed.sql` — inserts the four projects into the un-namespaced `projects` table.
- `supabase/migrations/0004_seed_ai_company_schema.sql` — inserts the four projects into `ai_company.projects`.
- `supabase/migrations/0006_seed_project_registry.sql` — inserts foodtruck-il, lab-os, inventory-engine, **burgerstop** into `ai_company.project_definitions` + funnel stages + connector configs.
- `supabase/migrations/0008_seed_revenue_connectors.sql` — instance-specific revenue config (ILS currency, FoodTruck-Supabase source).

**Target:** Split the `supabase/migrations/` directory into two folders or two filename prefixes:
- `supabase/migrations/platform/` (or `00*platform*.sql`) — schema-only, ships with the platform.
- `supabase/migrations/instance/` (or `00*seed*.sql`) — per-instance seed. Each new company replaces this folder.

**Migration steps:**
1. Create `supabase/migrations/instance/` and move `0002_seed.sql`, `0004_seed_ai_company_schema.sql`, `0006_seed_project_registry.sql`, `0008_seed_revenue_connectors.sql` into it. Keep filenames so order is preserved.
2. Update Supabase migration tooling (or write a `pnpm db:migrate` script) to apply platform first, then instance.
3. Move `0009_ceo_operating_system.sql` review — if it contains hardcoded data, split it too.
4. Add a note to `README.md` describing the two-step apply.

**Acceptance test:**
- Re-applying all migrations on a fresh Supabase project produces the same schema + data as today.
- Removing the `instance/` folder produces a schema with zero rows in `projects` / `project_definitions`, and the dashboard renders an "empty portfolio" state (acceptance criterion to confirm — may need a guard in the dashboard).

---

### L8. `packages/project-registry/src/seed-data.ts` ships the four projects + BurgerStop

**Severity:** High
**Why it leaks:** A TypeScript source file in the platform layer contains literal project records.

**Evidence:**
```
packages/project-registry/src/seed-data.ts:7-35
  seed-foodtruck-il, seed-lab-os, seed-inventory-engine, seed-burgerstop entries
```

**Target:** Move to an instance-layer file (`instance/seed-projects.ts` or read from `company.config.ts`).

**Migration steps:**
1. Inspect callers of whatever `seed-data.ts` exports (likely `seedRegistry()` or a const array).
2. Change the export to either accept the seed as an argument or read it from a config function passed in.
3. Move the literal records out of `packages/project-registry` into `instance/`.
4. Update the API route (`/api/registry/projects` or similar) to inject the instance seed when calling `seedRegistry()`.

**Acceptance test:**
- The `/registry` page shows the same projects as today.
- `grep -E 'foodtruck-il|lab-os|inventory-engine|burgerstop' packages/project-registry/src` returns zero matches.

---

### L9. Instance connector packages live alongside platform packages

**Severity:** Medium
**Why it leaks:** `packages/connectors/foodtruck-business/`, `packages/connectors/revenue/`, `packages/connectors/portfolio-intelligence/`, and the root-level `connectors/foodtruck-il/` etc. are intermingled with platform packages. There is no visual or structural cue distinguishing instance-only packages.

**Evidence:**
- `packages/connectors/foodtruck-business/`
- `packages/connectors/revenue/` (contains `foodtruck.ts` and `supabase-ledger.ts`)
- `packages/connectors/portfolio-intelligence/`
- Root `connectors/foodtruck-il/`, `lab-os/`, `inventory-engine/`, `whatsapp-engine/`

**Target:** Move all instance connectors under a single `instance/` folder at the repo root:
```
instance/
├── company.config.ts
├── connectors/
│   ├── foodtruck-il/
│   ├── lab-os/
│   ├── inventory-engine/
│   ├── whatsapp-engine/
│   ├── foodtruck-business/
│   ├── revenue/
│   └── portfolio-intelligence/
├── seed-projects.ts
└── migrations/
    └── 0002_seed.sql  (and the other seed migrations)
```

**Migration steps:**
1. Create `instance/` directory.
2. Move all instance connector packages into `instance/connectors/`.
3. Update `pnpm-workspace.yaml` to list `instance/connectors/*` instead of `connectors/*` and remove specific connector paths from `packages/`.
4. Update all `@ai-company/connector-*` imports — none of the import paths change because workspace names stay the same; only physical location moves.

**Acceptance test:**
- `pnpm install` resolves all workspace deps.
- `pnpm -r build` clean.
- Dashboard behaves identically.

---

### L10. Fake LLM clients reference project-specific keywords in regex

**Severity:** Medium
**Why it leaks:** Subtle — words like `truck`, `lab`, `consumer` are baked into the platform's heuristic regex. Works today; lies tomorrow for an AcmeCo project named e.g. `acme-warehouse`.

**Evidence:**
```
packages/ai-coo/src/fake-llm-client.ts:15
  pattern: /(throughput|orders?|events?|samples?|messages?|active|trucks?|labs?)/i
packages/ai-vp-marketing/src/fake-llm-client.ts:14
  if (/(signup|install|new[_-]?user|acquisition|truck|lab|consumer)/.test(n)) return 'acquisition';
```

**Target:** Keep only generic verbs / nouns in the regex. Project-specific signal names should be carried by metric metadata (a `category?: FunnelStage` field on `MetricInput`), not pattern-matched by the platform.

**Migration steps:**
1. Strip `trucks?|labs?` from `OPS_PATTERNS` in COO Fake client.
2. Strip `truck|lab|consumer` from `stageFor` in VP Marketing Fake client.
3. Optionally introduce `MetricInput.category?: FunnelStage` so connectors can tag their metrics explicitly. Existing untagged metrics fall through pattern-based detection.

**Acceptance test:**
- Run COO + VP Marketing Fake briefings against the current instance — outputs match (the project-specific keywords are redundant because the generic terms cover the same metric names).
- Diff produces zero changed stage/kind assignments.

---

### L11. Dashboard nav and page copy assume the instance

**Severity:** Low
**Why it leaks:** Page titles like "AI Chief of Staff" are generic enough, but copy such as "Israeli food truck operations platform" appears in mock data and headlines. The Command Center may surface project-named directives.

**Evidence:**
```
packages/database/src/in-memory-repositories.ts:46
  description: 'Israeli food truck operations platform.'
```

**Target:** Source descriptions from the registry/instance config, not from the platform.

**Migration steps:** Falls out of L6 and L7 — once seeds move to the instance, this string moves with them.

**Acceptance test:** `grep -i 'israeli\|kosher\|tel aviv\|rothschild' packages/` returns zero matches.

---

### L12. ILS currency assumption in revenue ledger seed and Fake clients

**Severity:** Medium
**Why it leaks:** Currency defaults to ILS in some places (`avg_ticket_size: 68 ILS`, `daily_revenue: 38420 ILS`). The next instance might be USD-native.

**Evidence:**
```
connectors/foodtruck-il/src/mock-data.ts          → ILS units
supabase/migrations/0008_seed_revenue_connectors  → ILS for foodtruck-il
```

**Target:** Currency belongs in connector output (`unit?: string`) and in project config — never assumed by the platform.

**Migration steps:**
1. Verify no platform package assumes a default currency. (Spot-check: the platform's `formatMetric()` switches on unit, so it's fine — confirm.)
2. Move the ILS-specific seeds to the instance migrations folder per L7.
3. No platform code change required; this is mostly a confirmation step.

**Acceptance test:** Platform formatting works for any unit string (USD, EUR, GBP, JPY).

---

## Cross-cutting acceptance test — "the AcmeCo clone test"

After all 12 leaks are addressed, this dry run must succeed without any platform-layer edit:

1. `git clone ai-company acme-corp`
2. `cd acme-corp`
3. Delete `instance/` entirely.
4. Recreate `instance/` with:
   - `company.config.ts` listing 3 new fictional projects (e.g. `acme-warehouse`, `acme-retail-api`, `acme-portal`).
   - One new connector package (`instance/connectors/acme-warehouse/`) returning mock data.
   - Seed migration files inserting the new projects.
5. `pnpm install && pnpm -r build && pnpm dev`
6. Visit `http://localhost:3000` — see 3 projects, not 4. Trigger sync → Acme-warehouse metrics appear. Run a CoS briefing → it references `acme-warehouse`, not `foodtruck-il`.
7. `git diff main -- packages/ apps/executive-dashboard/` reports **only** the dashboard branding/nav tweaks (the platform code is untouched).

When all 12 items in this plan are landed, that test passes.

---

## Sequencing recommendation

Suggested order, minimising churn risk per step:

1. **L7** (split migration folders) — cleanest, no code change, lets every subsequent step rely on the seed/schema split.
2. **L6** (in-memory seed parameterised).
3. **L11** + **L12** (string/currency descriptions move with L6/L7).
4. **L10** (strip project keywords from Fake regex).
5. **L8** (project-registry seed moved out).
6. **L9** (instance/ folder restructure).
7. **L5** (dashboard package.json deps removal).
8. **L4** (`platform.ts` instance entry point).
9. **L2** (COO vendors via project metadata).
10. **L3** (VP Marketing channels via project metadata).
11. **L1** (CoS owner-acquisition decoupling — biggest single change; do last when the boundary is otherwise stable).

Each step is independently revertable. After every step, the dashboard should render identically against the current instance.

---

## What this plan does NOT do

- **No code changes in this pass.** Documentation only.
- **No new packages created.** The `instance/` folder is proposed but not yet a workspace target.
- **No build/migration tooling changes.** Those land alongside L7.
- **No new tests written.** Acceptance tests in this plan are described; landing them is part of each refactor step.
