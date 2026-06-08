# D061 / P056.1.5 — Data Mapping CONFIRMED (locked implementation contract)

**Leaf:** P056.1.5 (Wave 1A — lock the contract) · **Branch:** `p056/executive-operating-system-ui`
**Supersedes the `(confirm P1.5)` markers** in `02-…data-mapping.md` Artifact 3. Method: read the
dashboard API routes (`apps/executive-dashboard/app/api/**/route.ts`) and the data-layer repository
interfaces (`packages/database/src/repositories.ts`) directly — no DB writes, no runtime guess.

**Verdict:** every Wave-1 component has a **confirmed live source** or a **filed backlog ticket whose
data-layer read already exists** (trivial route, no new service). Nothing in Wave 1 is blocked.

---

## 1 · Read-endpoint confirmation (the `(confirm P1.5)` set)

| Wave-1 read | HTTP route | Data-layer method | Status |
|---|---|---|---|
| **Decisions list** | `GET /api/ceo/decisions` | `listDecisions()` (`lib/ceo-operating-system`) | ✅ **CONFIRMED — route exists** |
| **Executive reports read** | `GET /api/reports?type=` | `repos.reports.list({ reportType?, limit })` | ✅ **CONFIRMED — route exists** |
| **Registry read** (ProjectCard) | `GET /api/registry/projects` | `loadProjectRegistryView(portfolio)` | ✅ **CONFIRMED — route exists** |
| **Outcomes read** | `GET /api/tasks/[id]/outcomes` · `GET /api/objectives/[id]/outcomes` · `GET /api/outcomes/by-metric` | `repos.taskOutcomes.listByTask` · `repos.objectiveOutcomes.*` | ✅ **CONFIRMED — per-entity routes exist** (no global list; not needed for Wave 1 — Recent Wins reads outcomes per completed task) |
| **Proposals list** (DecisionCard / Inbox queue) | _none yet_ | `repos.taskProposals.listByStatus('proposed')` **exists** | ⚠️ **GAP → ticket `P056-RT-1`** — data-layer read ready; thin `GET /api/proposals?status=` route to be added when its consumer (P056.4.1 Inbox decision queue) is built |
| **Risks read** (RiskCard / Inbox risks / Home critical risks) | _none yet_ | `repos.risks.listOpen()` **exists** | ⚠️ **GAP → ticket `P056-RT-2`** — data-layer read ready; thin `GET /api/risks` route to be added when its consumer (P056.3.3 / P056.4.2) is built |

**On the two gaps:** these are *not* missing data and *not* new services. `listOpen()` and
`listByStatus()` are existing, tested repository reads (the COO executive already writes risks via
`repos.risks.createMany`; the promote route already reads proposals via `repos.taskProposals.getById`).
The only missing piece is a ~10-line GET handler. Per the WBS build order they are added at their
consuming screen (Inbox/Home, P056.3–4), not now — so Wave-1 **primitives** (P056.2) take typed props
and render from sample data, and the live wiring lands with the screen. Filed, not faked.

### Mutation endpoints (already E2-verified — unchanged, listed for completeness)
- `PATCH /api/ceo/decisions/[id]` (approve/decide) ✓
- `POST /api/proposals/[id]/promote` · `POST /api/proposals/[id]/reject` ✓
- `POST /api/tasks/[id]/complete` ✓

---

## 2 · Field confirmations

### Confidence / Historical-ROI (RecommendationCard) = **NEW-FIELD — CONFIRMED absent**
- `grep -niE 'confidence|roi' packages/shared-types/src` → **no match**. The `ExecutiveReport<TBody>`
  type (`packages/shared-types/src/reports.ts`) carries an opaque `body`; no executive emits a
  confidence or historical-ROI scalar today.
- **Contract decision:** ship `RecommendationCard` with the Confidence/ROI slot **hidden** (not
  zero-filled, not faked). Back-fill is **Wave-2 / P056.9** once an executive emits the field.

### ProjectCard health field = **DERIVED — CONFIRMED**
- Source: `loadProjectRegistryView` joins `project_definitions` (registry) with a per-project
  `funnelStatus` from the funnel/portfolio-intelligence engine — `ProjectRegistryViewRow.funnelHealth`
  is `FunnelHealth['status'] | null`, **not** a stored column.
- `FunnelHealth.status` enum (`packages/shared-types/src/funnel.ts`) = `'healthy' | 'warning' | 'critical'`.
- **3-state presentation map (StatusBadge):**

  | engine `funnelHealth` | UI state | label | token |
  |---|---|---|---|
  | `'healthy'` | Healthy | "Healthy" | `healthy` (emerald-600) |
  | `'warning'` | Needs Attention | "Needs Attention" | `attention` (amber-500) |
  | `'critical'` | Action Required | "Action Required" | `action` (red-600) |
  | `null` | Unknown | "No signal" | `outline` (neutral) — empty-state-valid: no portfolio snapshot yet |

- **Doctrine note:** `funnelHealth` is nullable (no portfolio snapshot = `null`). The 3-state map
  MUST carry a 4th neutral "no signal" rendering so zero-data projects render cleanly
  (empty-state-is-valid gate), never a fabricated "Healthy".

---

## 3 · Locked component → source → status (the contract P056.2+ builds against)

| Component | Entity / source | Read | Status |
|---|---|---|---|
| **DecisionCard** | `ceo_decisions` (proposed) + `task_proposals` | `/api/ceo/decisions` ✓ · proposals via `P056-RT-1` | **HAVE** |
| **RecommendationCard** | `executive_reports.body` + evidence count | `/api/reports` ✓ · `/api/tasks/[id]/evidence` ✓ | **HAVE** — Confidence/ROI hidden (NEW-FIELD, Wave 2) |
| **RiskCard** | `risks` | `repos.risks.listOpen()` via `P056-RT-2` | **HAVE** — likelihood/impact scoring deferred (NEW-SVC, Wave 2) |
| **ProjectCard** | `project_definitions` + funnel engine | `/api/registry/projects` ✓ | **HAVE / DERIVED** (health = 3-state map above) |
| **StatusBadge** | funnel/health engine → 3-state | derived (no endpoint) | **DERIVED** |
| **AIChiefOfStaffPanel** | directives + decisions + risks + tasks + reports summaries | composed existing GETs | **DERIVED** |
| **ActivityFeed (Pulse)** | client union of `created_at` across existing reads | existing reads (v1) | **DERIVED** — true event stream = NEW-SVC (Wave 2) |
| **SearchBar** | cross-entity index | — | **NEW-SVC (Wave 2)** — shell only in Wave 1 |

---

## 4 · Backlog filed (carried into P056.3/4 + Wave 2)

| Ticket | Type | Description | Lands at |
|---|---|---|---|
| `P056-RT-1` | thin route | `GET /api/proposals?status=proposed` → `repos.taskProposals.listByStatus` | P056.4.1 (Inbox queue) |
| `P056-RT-2` | thin route | `GET /api/risks` → `repos.risks.listOpen` | P056.3.3 / P056.4.2 |
| `P056-NF-1` | NEW-FIELD | Confidence / Historical-ROI on executive recommendations | Wave 2 / P056.9 |
| `P056-NS-1` | NEW-SVC | RiskCard likelihood/impact scoring | Wave 2 / P056.9 |
| `P056-NS-2` | NEW-SVC | First-class activity/event stream (replace client-union Pulse) | Wave 2 / P056.9 |
| `P056-NS-3` | NEW-SVC | Global cross-entity Search index | Wave 2 / P056.7 |

**Gate (P056.1.5):** every Wave-1 component has a confirmed source or a backlog ticket → **PASS.**
Artifact 3 is hereby locked as the implementation contract for P056.2 onward.
