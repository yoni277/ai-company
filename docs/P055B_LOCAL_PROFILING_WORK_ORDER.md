# P055B — Local profiling work order: `/ceo` navigation freeze

**Status:** Ready (after the P055 landing mitigation deploys)
**Owner:** Builder (Claude Code, local) — needs a running app + browser DevTools
**Parent:** P055 (Active / mitigated)

## Why this exists

`/ceo` (Command Center) is the only page from which **soft navigation freezes the
renderer's main thread** for 45+ seconds, then recovers without navigating. This
was proven on production with a temporary error capture that found **zero**
errors — so it is **not** a hydration mismatch, exception, auth, RSC, server, or
route problem. It is a **client CPU/render freeze** triggered by navigating
*away from* `/ceo`. The page is tiny (258 DOM nodes, 45 KB), so it is not data or
DOM volume. The exact blocking call requires a CPU/React profiler flamegraph,
which can only be captured from a local run.

## Goal

```
reproduce /ceo navigation freeze locally
capture a Chrome Performance profile of the freeze
capture a React Profiler trace
identify the blocking component / call
apply the minimal fix
verify /ceo can safely become the landing again
```

## Setup

```bash
# from repo root, on a branch off main
pnpm install
AI_COMPANY_DATA_MODE=mock pnpm --filter executive-dashboard dev   # mock data; no Supabase needed, no auth gate
# open http://localhost:3000/ceo
```

Mock mode renders `/ceo` with seeded data and bypasses the auth gate (the
freeze is client-side and reproduces without real data).

## Reproduce + profile

1. Open `http://localhost:3000/ceo`, let it fully hydrate.
2. Open DevTools → **Performance**. Start recording.
3. Click any header nav link (e.g. **Projects**). Observe the page NOT navigate.
4. Stop recording after ~5 s of the freeze.
5. In the flamegraph, find the long synchronous task on the main thread during
   the navigation transition. Note the top self-time frames.
6. Repeat with the **React DevTools Profiler** (record → click link → stop) to
   see which component(s) render repeatedly or expensively during the transition.

## Prime suspects (start here)

- `components/command-center/CeoOperatingSystemPanels.tsx` — the heavy client
  panel rendered on `/ceo` (large form + lists). Inspection found only O(n) maps,
  but check for: an effect/memo recomputing on every transition tick, a function
  identity that changes each render feeding a child, or an expensive synchronous
  computation in render.
- `components/command-center/WeeklyGoalsWidget.tsx` — `useEffect(..., [goals])`
  where `goals` may be a fresh array reference each render; confirm it is not
  looping `setChecked` during the transition.
- `components/command-center/CommandCenterView.tsx` (server) and
  `CommandCenterLayout.tsx` — confirm nothing serializes a huge payload.
- The interaction of the navigation **transition** (React 19 `startTransition`)
  with a perpetually-pending Suspense boundary on `/ceo`.

## Acceptance

- A captured profile that names the blocking component/call (attach to P055B).
- A minimal fix (memoize / stabilize references / split or defer the heavy
  panel / fix a Suspense boundary) that makes a soft nav from `/ceo` commit in
  < 500 ms with no main-thread freeze.
- Re-verify the five-point check, then **revert the landing redirect**
  (`app/page.tsx`) so `/ceo` can be the landing again, and move Overview back to
  `/` if desired.

## Verify (after fix)

```
/ceo hydrates, then a header link click navigates in < 500 ms
no >1 s main-thread task in the Performance profile during nav
nav works from /ceo to every other route
hard navigation to /ceo still renders
```
