# CLAUDE.md — how to work in this repo

This project is built by **two agents working together**. Read `docs/WAYS_OF_WORKING.md` for the full model. Summary:

- **Claude Code (you, in the terminal) = the Builder.** You own: `pnpm install`/build/typecheck/test/lint/`audit:leaks`, cross-package refactors and package-boundary work, dependency changes, `git` (branch/mv/rm/commit/PR), CI setup, file creation/deletion at scale.
- **Claude Cowork (desktop) = the Orchestrator & Verifier.** It owns: the Supabase database (resets, snapshots, row-count deltas, restore), live browser validation of the running dashboard + executives, the master tracker + Decision Log + validation reports, work orders, backups, and memory.

**Two Claude Code environments — know which one you are.** *Local* Claude Code (terminal on the Mac) shares the real working tree with Cowork and can see/triage uncommitted WIP. *Web/remote* Claude Code works on a **fresh clone of `origin`** and only sees committed+pushed work — it cannot see Cowork's local uncommitted changes. If your `git status` is clean but you were told the tree is "entangled," you are almost certainly the web clone: the WIP is in Cowork's *local* tree, not here. Don't fabricate a triage — report the mismatch and ask for the WIP to be pushed to a ref you can fetch.

You and Cowork share the **same git repo** and the **same Supabase project** (`wimsglxixekmjsfpnqjb`, schema `ai_company`). Rules to avoid collisions:

1. **Work on a branch, never directly on a baseline.** `main` stays clean. Do not merge anything that claims a property which hasn't actually been verified.
2. **Do not touch the Supabase database.** You cannot, and shouldn't try — DB resets/snapshots/verification are Cowork's job. Do not run anything that writes to the shared DB.
3. **One writer per resource at a time.** If Cowork is mid-task on the repo or DB, don't race it.
4. **Honest commits.** Never write a commit message that overstates what's verified. "Runtime/DB-behavior verified" claims come from Cowork, not from a passing typecheck.
5. **Build artifacts are never committed:** `next-env.d.ts`, `*.tsbuildinfo`, `.next/`, `node_modules/`.

## Doctrine gates (every change is checked against these)
- **Cloneability:** no business specifics (`foodtruck-il`, vendor/channel names, specific connector implementations) in `packages/` or generic `apps/` code. Guards: `pnpm audit:leaks` + the "Test E" grep (`grep -rniE 'foodtruck|lab-os|inventory-engine|whatsapp-engine' --include=*.ts --include=*.tsx packages apps | grep -v node_modules` → only comments / test fixtures).
- **Empty state is valid:** zero projects/data must boot and render cleanly; no auto-seed, no silent creation.
- **Evidence over assertion:** a property counts as verified only when the check that proves it has been run.

## Current standing state (2026-06-06)
- `D050` Zero-State Runtime Verified — **locked**. `D051` Backup & Restore Documented — **locked**.
- `D052` Generic Platform Layer Verified — **NOT locked** (waits on P015B).
- **Next build task: P015B** — see `docs/P015B_WORK_ORDER.md` (de-couple `portfolio-intelligence` + `revenue` from the FoodTruck connector via a resolver registry; instance layer registers it). Do it on a branch; verify in order: `pnpm install` → `pnpm -r typecheck` → `pnpm test` → `pnpm audit:leaks` → re-run Test E → one active-project validation. Then Cowork locks `D052`.
- **Before any commit:** the working tree on `main` is heavily dirty with a mix of *verified* P015A/registry changes and *pre-existing unverified* drift. Triage the diff into (a) verified P015A/registry set, (b) unrelated drift, (c) build artifacts — and stage explicitly. Do **not** `git add -A`.
- Do not disturb the DB snapshots `ai_company_backup_20260606` (pre-reset) or `ai_company_zerostate_20260606` (D050 baseline).

## Known build-quality gaps (from review, not yet fixed)
`pnpm lint` is broken (`next lint` removed in Next 16 → migrate to ESLint CLI). No real lint config, **no tests** (all `echo no-op`), **no CI**. `.nvmrc` pins 20.11 but runtime is Node 22. `middleware.ts` deprecated → `proxy.ts`. First tests should regression-lock the doctrine: empty-registry returns `[]` (no seed fallback), no auto-seed, and the scoring/health functions.

**Conclusive clean-tree build verification.** `dist/` alone is NOT enough — `tsc -b`
trusts the incremental cache at `packages/<name>/tsconfig.tsbuildinfo` (package root,
not inside `dist/`); omitting it yields false `TS6305` failures. Scope to both
`packages` and `connectors`:

    find packages connectors -name dist -type d -prune -exec rm -rf {} + ; \
    find packages connectors -name '*.tsbuildinfo' -delete
    pnpm build && pnpm -r typecheck
