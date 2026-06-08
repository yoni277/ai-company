# Architect Update — "Dashboard links not working" incident

**Date:** 2026-06-08 · **Owner:** CTO (Cowork) · **Tracker:** P051–P055

## TL;DR

A single user-visible symptom ("links don't work") turned out to be **five
independent problems** stacked on top of each other. Four are fixed and live in
production, each verified against the running deployment. One remains — a
client-side navigation bug isolated to the Command Center page — and is under
active diagnosis. The site went from **fully frozen** to **fully navigable
except from the `/ceo` landing page**.

## Shipped to production (`main`), verified live

| ID | Problem | Fix | Verification |
|----|---------|-----|--------------|
| P051 | Basic-Auth-only middleware returned 401 on the App Router's RSC/prefetch fetches, so every soft navigation silently aborted. | Migrated `middleware.ts` → `proxy.ts` (Next 16); first valid Basic Auth mints a secure HttpOnly cookie that authenticates all subsequent requests incl. RSC. | Live: RSC fetches return 200; cookie token matched independently. |
| P052 | No error boundaries — one failing route left the router broken and killed **all** nav incl. the header. | Added `app/error.tsx` + `app/global-error.tsx`. | tsc clean; deployed. |
| P053 | Nav prefetched **11 routes at once** → bursts of 503s; clicked route landed in a 503 wave. | `prefetch={false}` on the global nav. | Live: one RSC request per click. |
| P053 | Functions ran in `iad1` (US-East); Supabase is `ap-southeast-2` (Sydney) → cross-Pacific latency, timeouts. | Pinned `regions: ["syd1"]`. | Live: `x-vercel-id: fra1::syd1`; routes 200 in ~450–750 ms. |
| P054 | First (cold) hit to a route occasionally 503'd. | `maxDuration = 60` on the root layout. | Cold 503 is intermittent and self-recovers once warm; warm burst of 11 routes = 11/11 200. |

## Open — P055 (Active, **not** Pass)

**Soft navigation works from every page except `/ceo` (the default landing
page).** Reproduced live in the operator's browser:

- `/projects` → click nav link → navigates correctly.
- `/ceo` → click nav link → fires a **valid** RSC fetch (`/projects?_rsc` →
  200, `text/x-component`, correct `private/no-store` + `Vary` headers, ~420 ms,
  `syd1`) but the router never commits; page stays on `/ceo`.
- Full (hard) navigation to every route renders fine.

So routes, auth, and region are healthy. The residual defect is **client-side
and specific to navigations originating from the Command Center**. Because the
operator always lands on `/ceo`, every link appears dead — this is almost
certainly the true cause of the original report. It is **pre-existing**
(independent of the P051–P054 changes). Leading hypothesis: a hydration
mismatch or stuck transition in the heavy `/ceo` client components
(`CeoOperatingSystemPanels`). Not yet root-caused — production errors are
minified and the remote console reader is not surfacing them.

## Diagnostic result (P055) — it is NOT an error

The temporary `window.__DIAG__` capture (commit `fb29416`, live on prod) caught
**zero** errors — nothing on `/ceo` load + hydration, and nothing during the
failed navigation. So the cause is **not** a hydration mismatch and **not** a
thrown exception.

What it actually is: **a nav click from `/ceo` freezes the renderer's main
thread for 45+ seconds** (remote eval returns "renderer unresponsive"), then the
thread recovers without the navigation committing. The page is tiny — **258 DOM
nodes, 45 KB** — so it is not data volume or DOM size. This is a **runaway
synchronous computation/render triggered specifically by navigating away from
`/ceo`**. `CeoOperatingSystemPanels` (the heavy client panel) shows only O(n)
maps over small arrays on inspection — no obvious loop.

Pinning the exact line now requires a **CPU / React profiler flamegraph** of the
freeze, which needs a **local reproduction** — it cannot be captured through the
remote browser tools available to Cowork.

## Decision request for the Chief Architect

Pick the path for closing P055:

- **Option A — Mitigate now, profile after (Cowork recommends).** Change the
  default landing page off `/ceo` (e.g. to `/` Overview) and revert the
  diagnostic, so the dashboard is usable immediately (every other page navigates
  fine). Then root-cause the `/ceo` freeze via a local profile and fix at source.
- **Option B — Profile first, no mitigation.** Leave landing on `/ceo`; Cowork
  writes exact steps for the operator / Claude Code to capture a Chrome
  Performance + React Profiler flamegraph locally, then fixes the offending
  component from that evidence.
- **Option C — Best-guess refactor.** Skip profiling; rework `CeoOperatingSystem
  Panels` (memoization / split / defer) on a branch and deploy. Fastest to a
  diff, but may not hit the exact cause on the first try.

**In all cases:** revert the diagnostic commit `fb29416` before close.

## Standing asks (still open)

1. Approve continuing the diagnose→fix loop on P055.
2. Confirm the temporary `window.__DIAG__` diagnostic on production is acceptable
   until P055 closes (read-only; reverted immediately after).
3. Note: each merge to `main` was performed by the operator after a green build
   + live Cowork verification, consistent with the P051 gate model.

---

## Ruling execution report (Option A) — 2026-06-08

Ruling received: **Option A — mitigate now, profile/fix after.** Executed on
branch `fix/ceo-mitigation-landing` (`32308f6` code, `4e84956` docs), typecheck
clean. Mapped to each directive:

| Ruling item | Status | Evidence |
|-------------|--------|----------|
| 1. Default landing off `/ceo` → `/projects` | **Done (in code)** | `app/page.tsx` now `redirect('/projects')`. `/projects` confirmed lightweight (258-node class, renders clean) and navigable (soft-nav from it verified live earlier). Overview preserved at `/overview` (page moved, nav + back-links repointed). |
| 2. Revert diagnostic `fb29416` | **Done (in code)** | `window.__DIAG__` script removed from `app/layout.tsx`. ⚠️ **Still live on prod until this mitigation deploys** — `fb29416` is currently in production `main`. The revert goes live with the mitigation merge. |
| 3. Deploy + verify (4 checks) | **Pending** | Awaiting operator merge to `main`. Cowork will verify live: landing ≠ `/ceo`; nav works from `/projects`; hard nav to `/ceo` renders; `/ceo`→nav still broken. |
| 4. Keep P055 open, reclassify | **Done** | Tracker P055 → **Active** with `[MITIGATED]` note; not marked Pass. |
| Next: P055B work order | **Done** | `docs/P055B_LOCAL_PROFILING_WORK_ORDER.md`; tracker row **P055B** (Pending, Builder-owned). |

**"Not approved" items — complied:** no best-guess refactor of
`CeoOperatingSystemPanels`; P055 not declared passed; diagnostic reverted in code
(goes live on deploy).

**Single open risk to flag:** the diagnostic is still running in production until
the mitigation merge lands — recommend the operator merge promptly to clear it.

**Awaiting:** operator merge of `fix/ceo-mitigation-landing` → `main`, then Cowork
runs the four-point live verification and reports back.
