# Ways of Working — Cowork + Claude Code

How this project is built using **Claude Cowork** (desktop, MCP-driven) and **Claude Code** (terminal, real checkout) together. The guiding principle:

> **Match the tool to the work. Keep one source of truth. Never let both mutate the same shared state at the same time.**

Cowork and Claude Code share two live resources — the **git repo** (`/Users/yonimansharof/ai-company`) and the **Supabase project** (`wimsglxixekmjsfpnqjb`, schema `ai_company`). The rules below exist mostly to keep those two from colliding.

## 0. Two Claude Code environments — they do NOT share a filesystem with Cowork the same way

There are two distinct "Claude Code" contexts, and confusing them causes false reconciliations:

- **Local Claude Code** (terminal on the Mac) — shares the *actual working tree* at `/Users/yonimansharof/ai-company` with Cowork's Mac bridge. This is the only Claude Code that can see Cowork's uncommitted work-in-progress and triage/commit it.
- **Web/remote Claude Code** (container) — works on a **fresh clone of `origin`**. It only sees what has been **committed and pushed**. It cannot see local uncommitted WIP, local-only files, or anything Cowork edited on the Mac until that work is pushed to a ref it can fetch.

**Consequence:** Cowork edits the local tree directly (via the Mac bridge), so Cowork's changes are **local + uncommitted** until someone commits them. Web Claude Code is blind to them. Therefore:
- To hand work to **web** Claude Code, it must first be **committed and pushed** to a branch/ref (e.g. a scratch branch).
- Work that must touch the **local uncommitted tree** (triage, staging, committing existing WIP) can only be done by **local** Claude Code or by **Cowork via the Mac bridge** — never by web Claude Code.
- Durable + shareable = committed + pushed. Until then, the only copy of Cowork's session work is the local tree (and the iCloud code archive).

---

## 1. Responsibilities

### Claude Code (terminal / real local checkout) — the BUILDER
Owns anything that needs a real filesystem, git, or the package toolchain:
- `pnpm install`, `pnpm build`, `pnpm -r typecheck`, `pnpm test`, `pnpm lint`, `pnpm audit:leaks`.
- Multi-file / cross-package **refactors** and **package-boundary** work (e.g. P015B).
- `git` operations: branches, `git mv`, `git rm`, staging, commits, PRs.
- File **creation/deletion/rename** at scale; dependency changes (`package.json` + lockfile).
- CI configuration (`.github/workflows`), ESLint/test-runner setup.
- Anything Cowork physically cannot do here (see §3).

### Claude Cowork (desktop / MCP) — the ORCHESTRATOR & VERIFIER
Owns planning, data, live validation, and the record:
- **Database**: Supabase MCP — resets, migrations, snapshots (`ai_company_backup_*`, `ai_company_zerostate_*`), row-count checks, deltas, restore scripts.
- **Live runtime validation**: drive the running dashboard via the Chrome tools (Test A/B), run executives, read DB deltas — end-to-end proof that code behaves.
- **Machine bridge**: start/inspect the dev server, run one-off shell probes via the Mac bridge (osascript).
- **Record-keeping**: the master tracker (`AI-Company_Master_Status_Tracker.xlsx`), the Decision Log (Dxxx), validation reports under `docs/archive/...`, and persistent memory.
- **Planning & work orders**: turn architecture decisions into precise specs Claude Code executes (e.g. `docs/P015B_WORK_ORDER.md`).
- **Backups**: code archive to iCloud; DB snapshots in Supabase.

### Quick map
| Work | Owner |
|---|---|
| Build / typecheck / lint / test / CI | Claude Code |
| Refactors, package boundaries, deps | Claude Code |
| git: branch / mv / rm / commit / PR | Claude Code |
| DB reset / snapshot / restore / counts | Cowork |
| Live UI + executive validation (browser) | Cowork |
| Master tracker + Decision Log + reports | Cowork |
| Work orders / planning / memory | Cowork |
| Final verification after a build | Cowork |

---

## 2. The standard loop

```
DECIDE (Cowork)  →  BUILD (Claude Code)  →  VERIFY (Cowork)  →  RECORD (Cowork)
   work order        branch + commit         Test E / DB / UI     tracker + Decision Log
```

1. **Decide** — Cowork frames the change as a work order (scope, files, acceptance gates) and a Decision Log entry if it's a real decision.
2. **Build** — Claude Code implements on a **branch**, runs the full toolchain, and commits with an accurate message. It does *not* claim a property is verified that only Cowork can verify (e.g. live zero-state, DB deltas).
3. **Verify** — Cowork re-runs the live/DB checks Claude Code can't: Test E scan, `audit:leaks` result interpretation, DB row deltas, a live active-project or zero-state check.
4. **Record** — Cowork appends the tracker row(s), locks/unlocks the relevant Dxxx, and updates memory.

---

## 3. Hard boundaries (learned this session)

**Cowork CANNOT (in this sandbox):**
- `pnpm install` — fails with EPERM on the mounted FS.
- Delete or rename files (`rm`, `git mv`) — EPERM.
- Therefore: no package relocation, no dependency-edge changes, no clean multi-package refactor. → these are **Claude Code only**.

**Claude Code CANNOT:**
- Touch the Supabase database via MCP, take/restore DB snapshots, or read live row counts.
- Drive the live dashboard/executives in a browser for end-to-end validation.
- Render the tracker widget (it can edit the `.xlsx`, but the live view lives in Cowork).

**Neither may:**
- Commit with a message that overstates what's verified.
- Mutate the shared DB or repo while the other is mid-task on the same thing (see §4).

---

## 4. Collision rules (shared repo + shared DB)

- **One writer at a time per resource.** If Claude Code is editing the repo, Cowork holds repo writes (and vice-versa). If Cowork is mutating the DB, Claude Code doesn't run anything that writes to it.
- **Branch discipline.** Build work happens on a branch, never directly on a protected baseline. `main` stays clean; nothing claiming a not-yet-verified property merges.
- **The DB is a singleton.** There is one shared Supabase project. Treat snapshots (`ai_company_backup_20260606`, `ai_company_zerostate_20260606`) as immutable evidence — never overwrite them.
- **Build artifacts are not commits.** `next-env.d.ts`, `*.tsbuildinfo`, `.next/`, `node_modules/` are regenerated, never staged.

---

## 5. Handoff artifacts (how context travels)

Context passes between the two through files in the repo, not memory of a chat:
- **Work orders** — `docs/*_WORK_ORDER.md` (what to build + acceptance gates).
- **Validation reports** — `docs/archive/<event>/...` (what was proven, with evidence).
- **Master tracker + Decision Log** — `AI-Company_Master_Status_Tracker.xlsx` (status of every action + locked decisions Dxxx).
- **Restore/runbooks** — `docs/BACKUP_AND_RESTORE.md`, `scripts/runtime-reset/*`.
- **CLAUDE.md** (optional) — a short pointer so Claude Code auto-loads these conventions.

---

## 6. Doctrine gates that always apply (both tools)

Every change is checked against the platform's invariants before it counts as done:
- **Cloneability**: no business specifics (`foodtruck-il`, vendor names, channels) in `packages/` or generic `apps/` code. Guards: `pnpm audit:leaks` + the **Test E** grep.
- **Empty state is valid**: zero projects/data must boot and render cleanly; no auto-seed, no silent creation (P006B / the registry empty-state fix).
- **Evidence over assertion**: a property is "verified" only when the check that proves it has actually been run (typecheck for types, live DB/UI for runtime behavior).

---

## 7. Current standing state (live example of the model)

- `D050` Zero-State Runtime Verified — **locked** (verified by Cowork: live Test A/B + DB deltas).
- `D051` Backup & Restore Documented — **locked**.
- `D052` Generic Platform Layer Verified — **not locked** (waits on P015B).
- **P015B** — open work order (`docs/P015B_WORK_ORDER.md`); **Claude Code** executes it on a branch; **Cowork** verifies (Test E + active-project check) and then locks `D052`.
- **Commit** — held until verified changes are triaged and committed with an accurate message.
- Baseline: do not disturb `ai_company_zerostate_20260606` or the D050 state.
