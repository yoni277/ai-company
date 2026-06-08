# D061 — Wave-1 Implementation Artifacts (CTO)

**Status:** Planning only (pre-approved). Code BLOCKED by **D060**. Companion to `D061-CTO-implementation-plan.md`.
**Strategy:** 2-wave. **Wave 1 = CEO value** (Design System · Data Mapping · Core Primitives · Home · Inbox · Hardening checks). **Wave 2 = complete platform** (Projects · Project Details · Build · Mobile · Search · enhancements). Get Home + Inbox in front of the CEO before building the rest.

---

## Artifact 1 — UI Migration Matrix (the migration checklist)

| Current surface | New surface | Action |
|---|---|---|
| `/` Overview (Portfolio/Revenue/Funnel/metrics) | **Home** (decision-centric briefing) | **REPLACED** |
| `/ceo` (directives, decisions, action queue) | **Inbox** (decisions) + **Home** (briefing) | **MODIFIED / SPLIT** |
| `/executive-team` (executive reports) | **ExecutiveRecommendationCard** + Executive Briefings | **MODIFIED** |
| Daily-brief section | **AIChiefOfStaffPanel** (persistent primitive) | **MODIFIED → primitive** |
| Health score / status (green/yellow/red) | **Project Health** (3-state: Healthy / Needs Attention / Action Required) | **MODIFIED (presentation map)** |
| Phase-2 production metrics (GitHub/Supabase, env-bound — L20) | **Build → Platform Health** | **MOVED to BUILD (Wave 2)** |
| BI panels (Phase 4A/5A/5B portfolio/revenue/financial) | secondary drill-downs / **Project Details** | **DEMOTED from primary** |
| `/projects` | **Projects** (compact) + **Project Details** | **MODIFIED (Wave 2)** |
| — | **Inbox · Build workspace · Global Search · Mobile suite** | **NEW** |
| `/api/*` routes · DOOS entities · health/funnel/revenue engines | unchanged | **UNCHANGED (data layer)** |

Redesign = presentation-only over the existing, E2-verified data layer. No data-layer rewrite.

---

## Artifact 2 — Component Build Order (dependency graph)

```
P1  Theme / tokens (DESIGN.md → tailwind.config; RTL logical base; dark-mode-ready)
      │
      ▼   atoms
   StatusBadge (color+icon+text)  ·  ActionButton (primary/secondary/ghost, 44px)
      │
      ▼   feed / input
   ActivityFeed   ·   SearchBar
      │
      ▼   cards  (compose StatusBadge + ActionButton)
   DecisionCard  ·  ExecutiveRecommendationCard  ·  RiskCard  ·  ProjectCard
      │
      ▼   composite
   AIChiefOfStaffPanel  (briefing; composes cards/atoms)
      │
      ▼   screens
   HOME  →  INBOX
```
Build strictly bottom-up — no screen before its primitives; no card before StatusBadge + ActionButton. (`DecisionCard` also gets the missing component-library catalog entry here, per D062 carry-forward #1.)

---

## Artifact 3 — Data Mapping Matrix (the implementation contract — Wave 1)

`STATUS`: **HAVE** = existing entity/field · **DERIVED** = computed from existing data · **NEW-FIELD / NEW-SVC** = backlog. Write-APIs marked ✓ were exercised in the E2 run; reads marked *(confirm P1.5)* need endpoint confirmation.

| Component / section | Data source (entity) | API | Status |
|---|---|---|---|
| **DecisionCard** | `ceo_decisions` (proposed) · `task_proposals` | read GET `/api/ceo/decisions` ✓ · proposals read *(confirm P1.5)* · **mutate:** PATCH `/api/ceo/decisions/[id]` ✓, POST `/api/proposals/[id]/promote`\|`/reject` ✓ | **HAVE** |
| **ExecutiveRecommendationCard** | `executive_reports.body` · `evidence_tokens` (count) | GET reports *(confirm read route)* · GET `/api/tasks/[id]/evidence` ✓ | **HAVE** — *Confidence / Historical-ROI = NEW-FIELD* |
| **RiskCard** | `risks` | read *(confirm route)* | **HAVE** — *likelihood/impact scoring = NEW-SVC* |
| **ProjectCard** | `project_definitions` + health engine | registry read *(confirm route)* | **HAVE / DERIVED** |
| **StatusBadge (health)** | health engine (green/yellow/red) → 3-state | derived (no endpoint) | **DERIVED** |
| **AIChiefOfStaffPanel** | `ceo_directives` + `ceo_decisions` + `risks` + `tasks` + `executive_reports` summaries | composed GET (existing) | **DERIVED** |
| **ActivityFeed (Pulse)** | union of `created_at` across directives/responses/decisions/evidence/outcomes | client-union of existing reads (v1) | **DERIVED** → *true event stream = NEW-SVC* |
| **Home — Waiting for Decision** | `ceo_decisions` (proposed) + `task_proposals` (pending) | as DecisionCard | **HAVE** |
| **Home — Recent Wins** | `tasks` (completed) + `task_outcomes`/`objective_outcomes` | GET `/api/tasks/[id]` ✓ · outcomes read *(confirm)* | **HAVE / DERIVED** |
| **Inbox — decision queue** | `ceo_decisions` + `task_proposals` | as DecisionCard | **HAVE** |
| **Inbox — risks** | `risks` | read *(confirm)* | **HAVE** |
| **Inbox — inline Approve / Reject / Clarify** | decisions · proposals · tasks | PATCH `/api/ceo/decisions/[id]` ✓ · POST `/api/proposals/[id]/promote`\|`/reject` ✓ · POST `/api/tasks/[id]/complete` ✓ | **HAVE** |
| **SearchBar / Global Search** | cross-entity index | — | **NEW-SVC** (Wave 2) |

**Wave-1 read of this matrix:** every Wave-1 component is **HAVE or DERIVED** — buildable immediately. The only Wave-1 enrichment that's `NEW-FIELD` is **Confidence/ROI** on the recommendation card (ship the card without it, back-fill later). The `NEW-SVC` items (risk scoring, true activity stream, Search) are Wave-2 / deferrable. **P1.5's job:** confirm the *read* endpoints marked *(confirm)* and lock this matrix as the implementation contract.

---

## Execution order (if D060 releases tomorrow)
```
1. Baseline verification (build/typecheck/audit:leaks on the released main)
2. P1  Design System
3. P1.5 Data Mapping  (confirm the (confirm P1.5) endpoints; lock Artifact 3)
4. P2  Core Primitives (build order = Artifact 2)
5. P3  Home
6. P4  Inbox
7. CEO REVIEW  ← Wave-1 value in front of the CEO here
8. P10 hardening verification (re-run P051–P055 repro)
9. Wave 2: Projects · Project Details · Build · Mobile · Search
```
Gates: **D060** gates all code · cross-cutting constraints (RTL · a11y · P051–P055 hardening · real Next/Tailwind build) apply to every component · logged as **P056** at execution (skipping P051–P055 — concurrent workstream, L26).
