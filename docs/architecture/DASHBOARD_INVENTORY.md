# AI-Company — Dashboard Inventory (June 2026)

**App:** `apps/executive-dashboard` (Next.js 16).

---

## Global navigation

| Route | Label | Phase |
|-------|-------|-------|
| `/ceo` | Command Center | Command Center + 5C.1 |
| `/` | Overview | 2–5B |
| `/projects` | Projects | 1 |
| `/registry` | Registry | 4B |
| `/reports` | Reports | 1 |
| `/chief-of-staff` … `/vp-sales` | AI executives | 4 |

---

## `/` — Overview

**File:** `app/page.tsx`  
**Data:** `getPlatform()`, `loadPhase2Snapshot`, `loadPortfolioIntelligenceForDashboard`, `loadFoodTruckBusinessMetrics`, CEO OS lists.

### Production metrics (Phase 2)

| Panel | Purpose | Data source | Live / mock |
|-------|---------|-------------|-------------|
| Company health | Deterministic health score | `health-score` + GitHub + risks | GitHub live/mock badge |
| GitHub metrics | Open issues, PRs, commits | `connector-github` | Live badge |
| Supabase metrics | Platform DB activity | `connector-supabase` | Live badge |
| Top risks | Open risks list | `database` repositories | Live when supabase mode |
| Pending approvals | CEO attention items | Risks/opportunities pattern match | — |
| Daily CEO brief | Pre-computed brief sections | `deterministicDailyBrief` / LLM explain | Includes directives/decisions |

### Portfolio & intelligence panels

| Panel | Purpose | Data source | Live / mock |
|-------|---------|-------------|-------------|
| **Portfolio Overview** | Rank, funnel health, bottleneck, revenue cols, recommendations count | `portfolio-intelligence-engine` via `connector-portfolio-intelligence` | Per-row **live** / **mock** badge |
| **Revenue Overview** | Portfolio + per-project revenue, transactions, ATV | `connector-revenue` → `revenue-intelligence-engine` | Per-row **live** / **mock** |
| **Financial Intelligence** | Normalized financial rollup + trend columns (N/A) | `financial-intelligence-engine` | Per-row **live** / **mock** |
| **Owner Acquisition** | FoodTruck trucks, activation | `connector-foodtruck-business` | FoodTruck **live** / **mock** badge |
| **Funnel Intelligence** | Per-project funnel cards | `business-funnel-engine` + registry/mock or live counts | FoodTruck live; others mock counts |
| **CEO Action Queue** | P1/P2 recommended actions | Decision support + portfolio action queue | Recommendations only; no auto-exec |

### Summary cards (bottom)

| Panel | Purpose | Data source |
|-------|---------|-------------|
| Projects / risks / opportunities | Legacy project health | `database` repos |

---

## `/registry` — Project Registry

**File:** `app/registry/page.tsx`  
**Component:** `ProjectRegistryPanel`

| Element | Purpose | Data source | Live / mock |
|---------|---------|-------------|-------------|
| Source badge | database vs in-memory | `project-registry` | **database** in production |
| Project cards | Stages, connector type, funnel health | Registry + portfolio overlay | **mock (N)** on stage counts; **live capable** badge on connector |

---

## `/ceo` — Executive Command Center

**File:** `app/ceo/page.tsx`  
**RTL:** `dir="rtl"` for CEO-facing layout.

### Command Center (read-only highlights)

| Panel | Purpose | Data source | Live / mock |
|-------|---------|-------------|-------------|
| Top highlights (4 cards) | Priority, bottleneck, risk, top action | Portfolio + action queue | Live signals from FoodTruck when ranked #1 |
| Data maturity | Revenue total, live/mock project counts | Portfolio revenue + `projects[].live` | Shows 1/4 live, 3/4 mock |
| Weekly goals | Checkbox goals (local) | `localStorage` | N/A |
| Executive scorecard | CEO, CTO, COO, CFO, CoS status | Derived from connectors + maturity | CFO **PASS WITH RISKS** when mock > 0 |

### CEO Operating System (Phase 5C.1)

| Panel | Purpose | Data source | Live / mock |
|-------|---------|-------------|-------------|
| **CEO directive input** | Create standing directive / override | `POST /api/ceo/directives` → Supabase | Persists to DB |
| **Active directives** | List active directives | `GET /api/ceo/directives` | — |
| **CEO decision panel** | Approve / reject / defer recommended actions; owner, due date | Portfolio actions + `ceo_decisions` | DB only; **no external action** |
| **Decision tracker** | Open / approved / in progress / completed | `ceo_decisions` | — |

---

## API routes (dashboard)

| Route | Purpose |
|-------|---------|
| `/api/portfolio/intelligence` | Full portfolio snapshot |
| `/api/registry/projects` | Registry + validation |
| `/api/chief-of-staff/daily-brief` | CEO brief JSON |
| `/api/ceo/directives` | GET active / POST create |
| `/api/ceo/decisions` | GET list / POST create |
| `/api/ceo/decisions/[id]` | PATCH status, owner, due_date, notes |
| `/api/metrics/github`, `/api/metrics/supabase` | Phase 2 connectors |
| `/api/decision-support/actions` | Decision support results |

---

## Pages not listed in original inventory (reference)

| Route | Notes |
|-------|--------|
| `/chief-of-staff`, `/cto`, etc. | Generate/store executive briefings |
| `/projects/[slug]` | Per-project detail from legacy `projects` table |

---

## Panel → package map

```mermaid
flowchart LR
  OV[Overview] --> PIE[portfolio-intelligence-engine]
  OV --> RIE[revenue-intelligence-engine]
  OV --> FIE[financial-intelligence-engine]
  OV --> FUN[business-funnel-engine]
  OV --> FTB[foodtruck-business]
  CEO[/ceo] --> CC[command-center loader]
  CEO --> COS[ceo-operating-system]
  REG[/registry] --> PR[project-registry]
```
