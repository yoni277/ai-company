# D053 — Architectural Regression Lock (Work Order)

**Status:** Approved (CEO + Chief Architect). Branch work, per-step CA review, execution gated step-by-step.
**Branch:** `d053/architectural-regression-lock` off `main` (`3dacae0`). `main` stays protected.
**Authored by:** CTO. **Reviewed by:** Chief Architect. **Builder:** Claude Code (local). **Verifier/Cowork lane:** Step 6 + runtime spot-checks.

---

## Mission

Convert **D050–D052** from human-remembered doctrine into **machine-enforced regression gates**.

Before D052 the goal was *make the platform generic* (an architecture problem). After D052 the goal is *keep it generic* (a governance problem). D053 is the governance answer: the doctrine that humans currently have to remember (empty-state is valid; no business coupling in `packages/`; evidence-gated task completion) becomes a gate that fails the build when violated.

## What D052 verified — and the gap D053 closes

D052 verified the **data / type / dependency / resolver** boundaries. It did **not** verify the **prompt / semantic / cognitive** boundary. A confirmed leak survived D052 because the Test E pattern (`foodtruck|lab-os|inventory-engine|whatsapp-engine`) does not include domain nouns like `truck` or `owner acquisition`:

- `packages/ai-chief-of-staff/src/daily-brief.ts:80` — generic CEO-brief prompt instructs `"ownerAcquisitionSummary (one sentence with exact truck counts)"`.
- `packages/ai-chief-of-staff/src/daily-brief.ts:137,142` — `"Owner acquisition … not available"`.
- `packages/ai-vp-marketing/src/fake-llm-client.ts:201` — classifier regex includes `truck` (dev stub, lower tier).

The data path is already generic (`AcquisitionSummary { promptLine, fallbackSummary }` in `shared-types/src/phase2.ts` is instance-supplied) — only the literal wording leaks. This is a contained fix plus a guard so it cannot recur.

## Two engineering constraints (do not repeat past traps)

1. **Self-contained tests only (per D039).** Cross-package tests that pull `@ai-company/database` do not resolve standalone in this toolchain. Every doctrine unit test must be self-contained per package. Reuse the existing pattern already present in 3 packages: `node --import tsx --test tests/*.test.ts`. Do **not** introduce a new test framework.
2. **The evidence-gate trigger is a DB object.** `ai_company.assert_task_has_evidence_on_complete()` (migration `supabase/migrations/platform/0013_doos_phase1a_foundation.sql`) can only be exercised against live Postgres. CI proves it *exists in the migration*; the **Cowork lane** proves it *fires* (Step 6). It is not a CI unit test.

## Evidence gating is already built — protect it, do not rebuild it

Gemini's proposed "Milestone 2 (Evidence Enforced State Transition)" already exists on `main` and was validated on live data (D041/D042/D044):
- DB floor trigger `assert_task_has_evidence_on_complete()` raises if a task reaches `status='completed'` with zero evidence tokens (`0013_…`).
- `evidence_tier` enum (E0–E4), `evidence_tokens` (tier/verified_at/validator_version), `evidence_required` jsonb (`minTier/requiredKinds/minCount`).
- App-layer validator: `packages/doos-core/src/completion-gate.ts` + `validator.ts`; `0019_evidence_provenance.sql` makes kind own the tier and rejects operator-supplied tier.

D053 **tests** this (Step 4 app-layer validator unit test; Step 6 live DB trigger), it does not re-implement it.

---

## Steps (each verified before the next; CA reviews per step)

### Step 1 — Track C: hygiene cleanup
- `git rm --cached apps/executive-dashboard/next-env.d.ts` and add it to `.gitignore` (CLAUDE.md rule 5: build artifacts are never committed).
- Remove the P015A stub paths — **but only after proving each is content-clean / disabled.** For each of `apps/executive-dashboard/app/api/metrics/foodtruck-business/`, `apps/executive-dashboard/lib/owner-acquisition.ts`, `apps/executive-dashboard/components/OwnerAcquisitionPanel.tsx`, `packages/shared-types/src/business.ts` (+ `.d.ts`): show current content, show all imports/usages (grep references repo-wide), and confirm no active code references it. **If any target is still imported by live code, Step 1 STOPS and reports — no blind `git rm`.**
- **Verify:** `pnpm build` + `pnpm -r typecheck` green.

### Step 2 — Track B: cognitive leak remediation (prompt-facing text only)
- `ai-chief-of-staff/src/daily-brief.ts:80` — replace `"… exact truck counts"` instruction so the prompt emits the instance-supplied `acquisitionSummary.promptLine` verbatim.
- `ai-chief-of-staff/src/daily-brief.ts:137,142` — `"Owner acquisition … not available"` → generic `"Acquisition summary not available"`.
- `ai-vp-marketing/src/fake-llm-client.ts:201` — remove `truck` from the classifier regex.
- **Do NOT rename the `ownerAcquisitionSummary` field** — field rename is a wider API/type migration, deferred to a later cleanup after the guards exist. `ai-coo`'s "vendor" wording is generic and stays.
- **Verify:** build + typecheck green; (Cowork) runtime spot-check that the daily brief still renders.

### Step 3 — Track A: extend `audit:leaks`
Current `scripts/audit-leaks.mjs` enforces only (1) backward `instances/` imports and (2) `ensureSeededMockData` regression. Add:
- **(3) Business-connector coupling:** generic (non-connector-layer) packages may not import a specific business connector (`@ai-company/connector-foodtruck-business`) or a vendor SDK (e.g. `stripe`, `hubspot`). The connector layer (`packages/connectors/*`) is exempt for legitimate cross-connector imports.
- **(4) Prompt-boundary lexicon:** fail on domain nouns in source string/template content.
  - **Banned:** `foodtruck`, `food truck`, `truck`, `owner acquisition`, `dispatch`, `GMV`.
  - **Allowed (never ban — false-positive risk):** `owner`, `vendor`, `customer`, `revenue`.
  - Exclusions: connector layer, comments, test fixtures.
- Fold the Test E content grep into the same gate.
- **Verify:** extended `audit:leaks` + Test E PASS (green only because Step 2 fixed the leaks).

### Step 4 — Track A: doctrine unit tests (self-contained, `node --import tsx --test`)
- portfolio-intelligence: `register → get` returns the resolver; **unregistered connector type → generic mock, never FoodTruck**.
- revenue: `register → get`; unknown source type → generic mock-revenue, no FoodTruck.
- doos-core: `completion-gate`/`validator` pass/fail by tier/kind/count (locks the app-layer evidence logic).
- project-registry empty → `[]` **only if** testable with an injected in-memory store without crossing into `@ai-company/database`; otherwise this assertion moves to the Step 6 Cowork-lane DB test (per D039).
- Replace `echo no-op` test scripts on the touched packages so `pnpm test` runs the new tests.
- **Verify:** `pnpm test` runs and passes the new tests.

### Step 5 — Track A: CI workflow (first ever)
- `.github/workflows/ci.yml`, on push + PR: Node **22** (matches runtime), Corepack `pnpm@9.15.0`, then `install → build → typecheck → audit:leaks (extended) → Test E → test`.
- **Exclude `pnpm lint`** — broken since Next 16 removed `next lint`; lint repair is a separate workstream, not D053.
- `.nvmrc` correction (20.11 → 22) is allowed **only** as a ride-along explicitly tied to CI runtime parity. No broader toolchain cleanup.
- **Verify:** the workflow can only be proven green by pushing it — first green Actions run on the branch is the verification.

### Step 6 — Cowork lane: live evidence-gate regression
Against a scratch / zero-state DB (recorded + restored after): insert a task, attempt `status='completed'` with no evidence token → expect the `assert_task_has_evidence_on_complete` exception; add a valid token → completes; restore DB to recorded state. Proves the gate *fires* (complements the migration-exists check in CI).

---

## Capstone & lock criteria
Clean-tree build (`dist` + `*.tsbuildinfo` removed across `packages` + `connectors`) → `pnpm build` + `pnpm -r typecheck` + extended `audit:leaks` + Test E + `pnpm test` all green; CI first run green; Step 6 live regression PASS. Then Chief Architect D053 review → lock. `main` merge of the D053 branch follows the same PR-review path as P015B (no merge until ruled).

## Out of scope (explicit)
`ownerAcquisitionSummary` field rename; `pnpm lint` repair; broader toolchain/Node cleanup beyond CI parity; the D-006 messaging/governance workstream (separate worktree).
