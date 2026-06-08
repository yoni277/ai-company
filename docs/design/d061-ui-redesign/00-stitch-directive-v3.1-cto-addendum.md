# Stitch Directive — Iteration Addendum (v3.1)
## CTO Feasibility Conditions + Architect Refinements

**Context:** Companion to the *AI-Company Executive Command Center — Stitch Design Directive v3.0*.
**Status:** Design-track (allowed). **Implementation gated by D060** (repo hold) and **D061** (Stitch-first; mandatory CTO review before any code).
**Frame:** V1 Dashboard → V2 Executive Dashboard → **V3 Executive Operating System.** Remaining work is refinement + implementation readiness, not a fundamental redesign.

Iteration-1 delivered Home + Inbox (the two core OPERATE screens). The design system (DESIGN.md) and the decision-centric model are accepted. This addendum is the requirement set for **iteration 2+**.

---

## A. Mandatory requirements for the next Stitch iteration (P1)

**A1 — RTL / Hebrew proof screens (not a statement of support — actual rendered screens).**
Deliver four renders: **Home (EN)**, **Home (Hebrew, RTL)**, **Inbox (EN)**, **Inbox (Hebrew, RTL)**. If the layout breaks under RTL, we find out now. Build with **logical CSS** (`margin-inline`/`padding-inline`, `start`/`end`, never hard `left`/`right`) and a global `dir` switch. The platform is **English + Hebrew, Day 1** — not English-first/Hebrew-later.

**A2 — Data-source annotation on every major component (now a hard requirement).**
Tag each component with one of:
```
DATA: HAVE              — backed by an existing entity/field today
DATA: DERIVED           — computed at runtime from existing data (no new storage)
DATA: NEEDS NEW FIELD   — requires a new field on an existing entity
DATA: NEEDS NEW SERVICE — requires a new table/stream/endpoint
```
This makes the design package a *planning tool*. Known gaps from iteration 1 that must be tagged honestly:
- **Confidence Level** → NEEDS NEW FIELD (executives don't emit confidence today).
- **Historical ROI / quantified outcome** → NEEDS NEW FIELD/SERVICE (not produced today).
- **Activity / "Pulse" Timeline** → DERIVED v1 (union of `created_at` across directives/responses/decisions/evidence/outcomes) → later NEEDS NEW SERVICE (first-class event stream).
- **Risk Card** impact/likelihood/mitigation → verify against the `risks` table; backfill = NEEDS NEW FIELD.

**A3 — Home accessibility parity with the Inbox.**
Iteration 1's Inbox is hardened (aria/role/`dir`); the Home is not (≈1 aria attr, no `dir`, a `canvas/d3` chart). Bring Home to the Inbox bar: full aria/role, `dir`, **status/health = color + icon + text (never color-alone)**, WCAG-AA contrast (verify the desaturated metadata greys hit ≥4.5:1), keyboard-operable Approve/Reject with the specified 2px focus ring.

---

## B. Architecture constraints (must hold on every screen)

**B1 — Inherit the P051–P055 hardening; never reintroduce the incident.**
The redesign drops onto the just-stabilized dashboard. Binding rule:
> **No design assumption may require loading all project data, all decision data, or all evidence data on initial page load.**
> Architecture = **Summary First, Details On Demand.**

Concretely: keep `prefetch={false}` on the global nav (no prefetch storm), per-route error boundaries, the auth-cookie model, and **inline-expand = lazy-load-on-expand** (Pulse feed + evidence detail paginated/lazy). No heavy charts on Home (confirm the canvas/d3 is a light sparkline or replace it).

**B2 — Design primitives, not pages.** Pages are compositions of reusable primitives:
```
DecisionCard · ExecutiveRecommendationCard · RiskCard · ProjectCard
StatusBadge · ActivityFeed · ActionButton · AIChiefOfStaffPanel
```
Each primitive ships a11y + RTL baked in. Build primitives first; screens compose them.

**B3 — BUILD vs OPERATE separation.** Navigation:
```
Home · Inbox · Projects · History · Build · Settings
```
**Build** is the platform-engineering workspace — L-backlog (L17–L26), cloneability status, architecture, platform health, governance, tech debt. It must NOT pollute the CEO Home, but it needs a real home. Operate = run the business; Build = improve the platform.

---

## C. New signature component (P2) — AI Chief of Staff Panel

A **persistent briefing** component, the clearest expression of *AI Chief of Staff, not Business Dashboard*:
```
Today's Briefing
  Automation App progressing normally.
  Two decisions require approval.
  One validation task is blocked.
  No critical risks detected.
```
Plain-language, push-not-pull, generated from the live state (directives/decisions/risks/tasks). This is the component that makes the platform *feel* like an executive assistant rather than a reporting tool.

---

## D. Implementation conditions (for the build plan, post-D060)

1. **Reimplement off the prototype stack.** Iteration-1 HTML uses the Tailwind **Play CDN** (in-browser compile, not production) + CDN fonts. Rebuild as **Next.js + the app's real Tailwind build**; treat the HTML as reference, not drop-in.
2. **DESIGN.md → Tailwind tokens** (colors/typography/spacing/radius/elevation become the theme).
3. **Primitives first**, then compose screens (B2).
4. **Data-gap triage:** ship only `HAVE`/`DERIVED`; route `NEEDS NEW FIELD/SERVICE` to the backlog — never render an empty/fake field.

---

## E. Prioritized order for iteration 2+

```
P1  RTL / Hebrew proof screens (Home + Inbox, EN + HE)
P1  Data-source annotations on all components
P1  Home accessibility parity with Inbox
P2  Build workspace (the 6th nav item + its screens)
P2  AI Chief of Staff panel (signature briefing component)
P2  Data-gap tagging (HAVE / DERIVED / NEEDS NEW FIELD / NEEDS NEW SERVICE)
P3  Remaining screens: Projects · Project Details · standalone Recommendation/Risk cards ·
    Mobile (bottom nav, 44px targets) · Global Search · AI-Chief-of-Staff experience · Role Charter viewer
```

---

## F. Governance gates (unchanged)
- **D060** — no repository work (reboot/switch/commit/run) until the dashboard-incident workstream releases the tree clean.
- **D061** — Stitch-first: design → CEO approval → **CTO Step-6 feasibility review** → refine → only then implement. This addendum *is* the Step-6 output for iteration 1.
- Roles: **CEO** approves product direction · **Chief Architect** owns UX · **CTO** owns implementation.
