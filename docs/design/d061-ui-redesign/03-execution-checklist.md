# P056 — Execution Checklist (Operational Runbook)

**Use:** the moment **D060 releases** (dashboard-incident workstream commits + cleans the tree), run this top-to-bottom. Planning artifact — companion to `D061-CTO-implementation-plan.md` + `D061-wave1-implementation-artifacts.md`. **No box may be checked early; each gate blocks the next.**

---

## GATE 0 — D060 release (repo availability)
```
□ Dashboard workstream confirmed repo released
□ git status clean (no foreign WIP)
□ No .git/index.lock present
□ On main; main = released operating baseline (P051–P055 merged)
```
→ If any box fails: **HOLD.** Do not switch branches, stash, or commit. Re-confirm with CA.

## GATE 1 — Commit pending + open P056
```
□ Commit validation-sprint-asset-pack-v1.md (E4 deliverable, still untracked)
□ Commit D061 plan + 3 artifacts (plan / migration matrix / build order / data mapping)
□ Create branch p056/executive-operating-system-ui (do NOT build on main)
□ Tracker row P056 opened (skip P051–P055 — L26 collision)
```

## GATE 2 — Baseline verification (clean-tree build)
```
□ Clean dist + tsbuildinfo (packages + connectors — per CLAUDE.md)
□ pnpm install
□ pnpm build && pnpm -r typecheck   (green)
□ pnpm test                         (green)
□ pnpm audit:leaks                  (4-check gate passes)
□ Test E grep                       (no business specifics in packages/)
```
→ Baseline must be green **before any UI code.** Red here = stop, triage, report.

---

# WAVE 1A — Foundation  → deliverable: Component Library
```
□ P1   Design System (DESIGN.md → tailwind.config; ThemeProvider; RTL logical base; off Play CDN)
□ P1.5 Data Mapping  (confirm the (confirm P1.5) read endpoints; lock Artifact 3 as contract)
□ P1.5 Confirm Confidence/ROI tagged NEW-FIELD; confirm ProjectCard field HAVE-vs-DERIVED
□ P2   Primitives: StatusBadge · ActionButton · ActivityFeed · SearchBar
□ P2   Cards: DecisionCard (+ component-library catalog entry, D062 #1) · RecommendationCard · RiskCard · ProjectCard
□ P2   AIChiefOfStaffPanel  ← foundation-tier (product identity, per CA)
        Gate: each primitive passes WCAG-AA + keyboard + RTL render + renders from real/HAVE data
```

# WAVE 1B — CEO Experience  → deliverable: Executive Operating System MVP
```
□ P3 Home  (briefing · Waiting-for-Decision · Critical Risks · Recent Wins · Activity Pulse[DERIVED] · Project Health)
        Gate: status understood <10s; Approve = 1 click; Home a11y parity w/ Inbox (D062 #4); no all-data-on-load
□ P4 Inbox (decision queue · risks · inline Approve/Reject/Request-Clarification wired to real APIs)
        Gate: 1-click decision works end-to-end through the verified endpoints; lazy detail-on-expand
□ ★ CEO REVIEW  ← first review here; most redesign value is on screen
```

# WAVE 1C — Production Hardening  → deliverable: Merge Candidate
```
□ P10 Re-run P051–P055 incident repro (RSC auth · prefetch · cold-start · error boundaries) — zero regressions
□ Cross-cutting confirmed on every screen: prefetch={false} · per-route error boundaries · Summary-First/lazy
□ Merge approved by CA (only after hardening passes)
```

---

# WAVE 2 — Complete platform (post-MVP)
```
□ P5 Projects + Project Details (multi-business proven on the registry, not mock)
□ P6 Build workspace (Platform Health · Architecture backlog L17–L26 · governance · tech debt · cloneability)
□ P7 Global Search (depends on Search-AI / index NEW-SVC)
□ P8 Mobile (Home/Inbox/Projects/Build/Search/Settings · bottom-nav · 44px · EN+HE)
□ Enhancements: RiskCard scoring (NEW-SVC) · Confidence/ROI back-fill (NEW-FIELD) · first-class event stream (NEW-SVC)
```

---

**Governance:** D060 gates all code · D061 CLOSED (D062) · this checklist + plan + artifacts are pre-approved planning. Each WAVE gate is a hard stop. Log progress to the tracker as **P056** sub-steps at execution.

**Status now:** `Design COMPLETE · Plan COMPLETE · Artifacts COMPLETE · Checklist COMPLETE · Implementation WAITING ON D060.` Next meaningful event = repo release → start at GATE 0.
