# D061 → CTO Implementation Plan — Executive Operating System UI

**Status:** Planning only (pre-approved). **Design = CLOSED (D062).** **Code BLOCKED by D060** (repo held by the dashboard-incident workstream). No repo work in this document — it is the ready-to-execute plan for the moment D060 releases.
**Re-sequencing principle:** ship the highest-value, lowest-unknown slice first — **Design System → Core Primitives → Home → Inbox** — because that's where almost all CEO value lives *and* it's almost entirely buildable on data we already have.

---

## 0. Carry-forward from D062 (implementation items, not redesign)
1. Add **`DecisionCard`** as an explicit component-library entry (cornerstone primitive, not cataloged by name).
2. Confirm **Confidence / Historical-ROI** fields are tagged `NEEDS NEW` (not mis-tagged) — closed during Phase 1.5.
3. **Reimplement off the Tailwind Play CDN** onto the app's real Next build (all 8 Stitch files use the prototype CDN).
4. Verify **desktop Home a11y parity** against the Accessibility-Compliance spec when Home is built (Home wasn't in the delta package).

---

## 1. Critical-path / data-dependency map (your #2)

**The reassuring finding: the OPERATE MVP is unblocked.** The `NEEDS NEW` items do not sit on the path to Home/Inbox — they cluster in BUILD-workspace, Global Search, and card *enrichment*.

```
CAN BUILD IMMEDIATELY (DATA: HAVE / DERIVED) — no backend dependency
  • Design System + tokens (DESIGN.md → tailwind.config)
  • All core primitives (DecisionCard, RiskCard, ProjectCard, StatusBadge, ActionButton, ActivityFeed, AIChiefOfStaffPanel)
  • Home: briefing, "Waiting for Your Decision", project health (3-state map of the existing engine), Recent Wins
  • Inbox: decision queue (ceo_decisions/task_proposals), risks (risks table), Approve/Reject/Clarify (existing APIs)
  • Projects + Project Details (registry + executive_reports + evidence)
  • Activity Feed  → DERIVED (union of created_at across directives/responses/decisions/evidence/outcomes)

GATED ON NEEDS-NEW (defer behind the OPERATE MVP)
  • Global Search ............ NEEDS NEW SERVICE (search/indexing — "Search-AI")
  • RiskCard intelligence .... NEEDS NEW SERVICE (likelihood/impact scoring beyond raw risks rows)
  • Confidence / ROI on cards  NEEDS NEW FIELD  (executives don't emit these today)
  • Build workspace metrics .. NEEDS NEW SERVICE/FIELD (see §2 — mostly platform observability)
```

---

## 2. NEEDS-NEW enumeration (your #5)

**NEEDS NEW FIELD (3):**
| Item | Where | Lane | Plan |
|---|---|---|---|
| Confidence / Historical-ROI on recommendation/decision cards | Home, Inbox, Recommendation card | OPERATE | Add to the executive output schema (executives emit a confidence + expected-value), or render card without it in v1. |
| ProjectCard health/attention field | Projects, Home | OPERATE | Likely derivable from the existing health engine; confirm in Phase 1.5 — may be DERIVED, not new. |
| Infrastructure-health field | Build workspace | BUILD | Platform observability; defer with the Build workspace. |

**NEEDS NEW SERVICE (5):**
| Item | Where | Lane | Plan |
|---|---|---|---|
| Global Search / indexing ("Search-AI") | Search | OPERATE (P2) | New search/index service; Search ships after the core OPERATE screens. |
| RiskCard intelligence (likelihood/impact) | Inbox, Risk Center | OPERATE | v1 renders raw `risks` rows (HAVE); the scoring service is an enrichment, not a blocker. |
| AI Strategy Engine | Build / strategic views | BUILD | New analysis service; defer. |
| Architecture-Gap analysis | Build workspace | BUILD | Platform self-analysis; defer. |
| Legacy-Auth latency monitoring (Zone 4) | Build / platform health | BUILD | Observability; defer. |

**Read:** 1 OPERATE-critical new field (Confidence/ROI) + 1 OPERATE P2 service (Search). The other 6 are BUILD-workspace / enrichment and do **not** block the value-bearing screens. So "no major data-model changes" holds for the OPERATE MVP; the unknowns are scoped and deferrable.

---

## 3. UI migration strategy (your #3) — presentation-only over the existing data layer

The redesign **re-skins and re-organizes**; the API routes, DOOS entities, and deterministic engines (the layer E2 proved) stay.

```
REPLACED   /  (entity/metrics "Overview") .......... → new decision-centric HOME
MODIFIED   /ceo (directives/decisions) ............. → folds into HOME (briefing) + INBOX (decisions)
           /projects ................................ → new Projects (compact) + Project Details
           /executive-team .......................... → folds into Executive Briefings / Inbox
NEW        Inbox · Build workspace · Global Search · Project Details · AIChiefOfStaffPanel · Mobile suite
DISAPPEAR  BI-style metric/analytics panels as PRIMARY surfaces (become secondary drill-downs)
UNCHANGED  all /api/* routes · ceo_directives/decisions/tasks/evidence/outcomes · the health/funnel/revenue engines
```
This keeps the redesign low-risk: no data-layer rewrite, and it inherits the E2-verified governance APIs (approve/reject/complete) directly behind the new cards.

---

## 4. Phases — re-sequenced for speed (your #1, #4)

Each phase: **Inputs → Outputs → Acceptance Gate.** Cross-cutting constraints (§5) apply to every phase.

**P1 — Design System foundation** · Inputs: DESIGN.md tokens → Outputs: `tailwind.config` theme (colors/type/spacing/radius/elevation, dark-mode-ready), ThemeProvider, RTL logical-property base → Gate: tokens render in EN + HE (RTL); Storybook/preview builds.

**P1.5 — Data mapping** (moved early; your critical-path) · Inputs: the Stitch `DATA:` tags + the live schema → Outputs: the UI→data matrix; confirm Confidence/ROI/ProjectCard-field tags; enumerate the NEEDS-NEW backlog → Gate: every planned component has a confirmed data source or a backlog ticket.

**P2 — Core primitives** · Inputs: P1 + P1.5 → Outputs: `DecisionCard`(+catalog entry), `ExecutiveRecommendationCard`, `RiskCard`, `ProjectCard`, `StatusBadge` (color+icon+text), `ActionButton`, `ActivityFeed`, `AIChiefOfStaffPanel`, `SearchBar` — **a11y + RTL + lazy baked in** → Gate: each primitive passes WCAG-AA, keyboard nav, RTL render, and renders from real (or stubbed-HAVE) data.

**P3 — Home** · Inputs: P2 → Outputs: briefing, Waiting-for-Decision, Critical Risks, Recent Wins, Activity Pulse (DERIVED), Project Health, AIChiefOfStaffPanel → Gate: CEO understands status in <10s; Approve = 1 click; Home meets the a11y spec (carry-forward #4); no all-data-on-load.

**P4 — Inbox** · Inputs: P2 → Outputs: decision queue / risks / reviews / notifications with inline Approve/Reject/Request-Clarification wired to existing APIs → Gate: 1-click decision works end-to-end through the real endpoints; lazy detail-on-expand.

**P5 — Projects + Project Details** · Inputs: P2 + registry → Outputs: compact Projects, Ecosystem (multi-business), Project Deep-Dive (timeline/evidence/wins) → Gate: multi-business proven against the **registry** (not mock); summary-first.

**P6 — Build workspace** (P1) · Outputs: Platform Health, Architecture Backlog (L17–L26), Governance, Tech Debt, Cloneability → Gate: OPERATE/BUILD cleanly separated; BUILD-only `NEEDS-NEW` services stubbed-or-deferred, not faked.

**P7 — Global Search** (P2) · depends on the Search-AI/index service → Gate: search across projects/decisions/evidence/executives/objectives.

**P8 — Mobile** (P1) · Outputs: Home/Inbox/Projects/Build/Search/Settings, bottom-nav, 44px targets, EN+HE → Gate: thumb-reachable, RTL renders, parity with desktop IA.

**P10 — Hardening verification** (P0, final) · Gate: **re-run the P051–P055 incident repro** (RSC auth, prefetch, cold-start, error boundaries) — zero regressions.

---

## 5. Cross-cutting constraints (baked into every phase, not bolted on)
- **P051–P055 inheritance:** `prefetch={false}` global nav · per-route error boundaries · auth-cookie · **Summary First / Details On Demand** — *no screen loads all project/decision/evidence data on initial render*; inline-expand = lazy fetch.
- **RTL:** logical CSS only (`margin/padding-inline`, `start/end`); EN + HE from the first primitive.
- **Accessibility:** WCAG-AA contrast; status = color + icon + text; keyboard + ARIA; the 2px focus ring.
- **Stack:** Next + the app's real Tailwind build — not the Play CDN.

---

## 6. Effort
- **OPERATE MVP** (P1 → P1.5 → P2 → P3 → P4, + P10 verification): the value-bearing slice, almost all `HAVE`/`DERIVED` → ≈ the bulk of the CA's 10–15 day estimate.
- **Full package** (+ P5 multi-business, P6 Build, P7 Search, P8 Mobile, + the NEEDS-NEW services): add time proportional to the NEEDS-NEW build (Search-AI index, confidence/ROI schema, Build observability). Quantified precisely at P1.5.
- "No major data-model changes" holds for the MVP; the new-build work is scoped to Search + card enrichment + BUILD observability, all deferrable behind first value.

---

## 7. Execution order + gates
```
[gate] D060 releases (repo clean, no index.lock)  →  commit asset pack + this plan, baseline checks
P1 Design System → P1.5 Data Mapping → P2 Primitives → P3 Home → P4 Inbox      ← OPERATE MVP (ship/review here)
P5 Projects → P6 Build → P7 Search → P8 Mobile                                  ← completes the package
P10 Hardening verification (re-run P051–P055 repro)                            ← acceptance
```
**Acceptance (whole redesign):** Home/Inbox/Projects/Build/Mobile operational · RTL · a11y · data mappings documented · AIChiefOfStaffPanel operational · multi-business proven on the registry · **no P051–P055 regressions.**

*Governance: D060 gates all code; D061 design is CLOSED (D062); this plan is pre-approved planning only. Logged to the tracker as P056 (skipping P051–P055, which belong to the concurrent dashboard workstream — L26) once D060 releases.*
