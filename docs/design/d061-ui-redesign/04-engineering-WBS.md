# P056 — Engineering Work Breakdown Structure (Execution Board)

**Use:** activated at D060 release. Each leaf is a self-contained engineering task — ready to pick up with no further decomposition. Companion to the Implementation Plan + 3 artifacts + Execution Checklist. `[H]` HAVE · `[D]` DERIVED · `[N]` NEEDS-NEW (deferred). Cross-cutting on every leaf: RTL logical CSS · WCAG-AA (color+icon+text) · Summary-First/lazy · real Next+Tailwind build (no Play CDN).

---

## P056.0 — Pre-build gates (Checklist GATE 0–2)
```
P056.0.1  Confirm D060 released · tree clean · no .git/index.lock
P056.0.2  Commit untracked E4 asset pack + D061 plan/artifacts/checklist
P056.0.3  Branch p056/executive-operating-system-ui off released main
P056.0.4  Clean dist+tsbuildinfo (packages+connectors); pnpm install
P056.0.5  Green baseline: build · typecheck · test · audit:leaks(4) · Test E
P056.0.6  Open tracker row P056
```

## P056.1 — Design System  (Wave 1A)
```
P056.1.1  Tailwind tokens from DESIGN.md (color/type/spacing/radius/elevation)
P056.1.2  ThemeProvider (dark-mode-ready) + global dir switch (EN/HE)
P056.1.3  RTL foundation: logical-property base (margin/padding-inline, start/end)
P056.1.4  Preview/Storybook harness; render tokens EN + HE
  Gate: tokens render both directions; harness builds
```

## P056.1.5 — Data Mapping  (Wave 1A — lock the contract)
```
P056.1.5.1  Confirm the (confirm P1.5) read endpoints in Data Mapping Matrix
P056.1.5.2  Confirm Confidence/ROI = NEW-FIELD; ProjectCard field HAVE vs DERIVED
P056.1.5.3  Lock Artifact 3 as implementation contract; file NEW-SVC/FIELD backlog
  Gate: every Wave-1 component has a confirmed source or a backlog ticket
```

## P056.2 — Core Primitives  (Wave 1A → Component Library)
```
P056.2.1  StatusBadge          [D] color+icon+text; 3-state health map
P056.2.2  ActionButton         [H] primary/secondary/ghost; 44px; 2px focus ring
P056.2.3  ActivityFeed         [D] lazy/paginated; union-of-created_at feed
P056.2.4  SearchBar (shell)    [H] input shell only; service wired in Wave 2
P056.2.5  DecisionCard         [H] + component-library catalog entry (D062 #1)
P056.2.6  RecommendationCard   [H] (Confidence/ROI slot hidden until [N] back-fill)
P056.2.7  RiskCard             [H] raw risks rows; scoring deferred [N]
P056.2.8  ProjectCard          [H/D] registry + health engine
P056.2.9  AIChiefOfStaffPanel  [D] FOUNDATION-TIER — plain-language briefing from live state
  Gate (each): WCAG-AA · keyboard · RTL render · renders from real/HAVE data
```

## P056.2.10 — Primitive Demo Page  (Wave 1A — gallery before composition)
```
P056.2.10  Render all primitives together with real sample data:
           DecisionCard · RecommendationCard · RiskCard · ProjectCard ·
           AIChiefOfStaffPanel · StatusBadge · ActionButton · ActivityFeed · SearchBar
  Gate: all primitives render · RTL (EN+HE) renders · WCAG-AA passes · theme consistent
  Purpose: catch UI/RTL/contrast/theme issues BEFORE screen composition (cheapest fix point)
```

## P056.3 — Home  (Wave 1B)
```
P056.3.1  Executive Briefing (compose AIChiefOfStaffPanel)        [D]
P056.3.2  Waiting For Decision (ceo_decisions + task_proposals)   [H]
P056.3.3  Critical Risks (risks)                                  [H]
P056.3.4  Recent Wins (completed tasks + outcomes)                [H/D]
P056.3.5  Activity Pulse (lazy ActivityFeed)                      [D]
P056.3.6  Project Health (3-state map of health engine)          [D]
  Gate: status <10s · Approve 1-click · Home a11y parity w/ Inbox (D062 #4) · no all-data-on-load
```

## P056.4 — Inbox  (Wave 1B)
```
P056.4.1  Decision queue (decisions + proposals)                 [H]
P056.4.2  Risks section                                          [H]
P056.4.3  Inline Approve  → PATCH /api/ceo/decisions/[id]         [H]
P056.4.4  Inline Reject   → POST /api/proposals/[id]/reject       [H]
P056.4.5  Request-Clarification / complete → POST /api/tasks/[id]/complete  [H]
P056.4.6  Lazy detail-on-expand (evidence/detail)                [H]
  Gate: 1-click decision works end-to-end through verified endpoints
```
### ★ P056.R — CEO REVIEW (stop here; request review before continuing)

## P056.10 — Hardening  (Wave 1C → Merge Candidate)
```
P056.10.1  Re-run P051–P055 repro: RSC auth · prefetch · cold-start · error boundaries
P056.10.2  Verify prefetch={false} nav · per-route error boundaries on every new route
P056.10.3  Full clean-tree build + typecheck + audit:leaks(4) + Test E green
P056.10.4  CA merge approval (only after 10.1–10.3 pass)
  Gate: zero regressions vs the released baseline
```

---

## WAVE 2 (post-MVP — decomposed at activation)
```
P056.5  Projects + Project Details   [H/D]  (multi-business on registry, not mock)
P056.6  Build workspace              [H/N]  (Platform Health · L17–L26 backlog · governance · tech debt · cloneability)
P056.7  Global Search                [N]    (Search-AI index service)
P056.8  Mobile suite                 [H/D]  (bottom-nav · 44px · EN+HE)
P056.9  Enhancements                 [N]    (RiskCard scoring · Confidence/ROI back-fill · first-class event stream)
```

---

**Execution model:** `D060 → P056.0 gates → P056.1/1.5/2/2.10 (1A) → P056.3/4 (1B) → ★CEO Review → P056.10 (1C) → merge → Wave 2.`
**Governance:** D060 gates all code · each P056.x Gate is a hard stop · log each milestone to tracker under P056 (skip P051–P055, L26).
**Status:** nothing left to design or plan; board is execution-ready. Blocking item = repo release only.
