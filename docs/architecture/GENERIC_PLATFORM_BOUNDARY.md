# AI-Company Generic Platform Boundary

**Status:** authoritative architectural rule
**Date:** 2026-06-03
**Supersedes:** the implicit "single instance" assumption in `docs/architecture.md`

---

## 1. Why this document exists

`ai-company/` is a **reusable operating system for AI-Native companies**. The CEO plans to duplicate it for additional businesses — different portfolios, different connectors, possibly different executive lenses.

The repo today bundles two concerns that need to be split conceptually:

1. **The platform** — generic, reusable across N companies, behaviour-stable.
2. **The instance** — one specific company's projects, connectors, vendor names, channel preferences, seed data, branded copy.

Until this boundary is enforced, cloning the repo for a new company means hand-editing platform code. That violates the primary rule.

> **Primary rule.** Never bake project slugs, vendor names, channel preferences, or any other instance-specific data into anything that lives in the platform layer. The platform layer reads its configuration; it never assumes a particular company.

This document defines what belongs where. The companion refactor plan (`docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md`) lists the current leaks and how to migrate them.

---

## 2. The two layers

### 2.1 Layer 1 — `ai-company-platform` (generic, reusable)

Everything in this layer must satisfy:
- No project slugs (`foodtruck-il`, `lab-os`, etc.) anywhere in source.
- No vendor names (`Wolt`, `Meta WhatsApp Cloud API`, `LIMS`).
- No language- or region-specific terms (`ILS`, Hebrew copy, Tel Aviv).
- No imports of an instance-specific connector or seed package.
- Behaviour depends only on the shape of `Project`, `ProjectMetric`, `Risk`, `Opportunity`, and other shared types — never on the *identity* of a project.
- Pattern-based detection (e.g. `/revenue/i`) is allowed; slug-based dispatch is not.

**Belongs in the platform:**

| Package | Purpose | Generic? |
|---|---|---|
| `packages/shared-types` | Domain interfaces | yes |
| `packages/database` | Repositories + schema accessors | yes (after seed extraction) |
| `packages/connector-framework` | `DataConnector` contract, registry, sync orchestrator | yes |
| `packages/ai-chief-of-staff` | Cross-functional executive | yes (after removing `connector-foodtruck-business` import) |
| `packages/ai-cto` | Engineering executive | yes |
| `packages/ai-coo` | Operations executive | yes (after removing `PROJECT_VENDORS`) |
| `packages/ai-cfo` | Finance executive | yes |
| `packages/ai-vp-marketing` | Growth executive | yes (after removing `PROJECT_CHANNEL_HINTS`) |
| `packages/ai-vp-sales` | Pipeline executive | yes |
| `packages/ai-executive-team` | Cross-executive synthesis | yes |
| `packages/business-funnel-engine` | Generic funnel definition + computation | yes |
| `packages/decision-support-engine` | Generic action queue computation | yes |
| `packages/portfolio-intelligence-engine` | Cross-project rollups | yes |
| `packages/project-registry` | Project metadata management | yes (after removing `seed-data.ts` projects) |
| `packages/revenue-intelligence-engine` | Generic revenue rollups | yes |
| `packages/financial-intelligence-engine` | Generic finance rollups | yes |
| `packages/health-score` | Generic health scoring | yes |
| `apps/executive-dashboard` (shell) | Dashboard UI shell, route definitions, generic API handlers | yes (after refactoring `platform.ts` to discover, not import) |
| `supabase/migrations/0001_init.sql`, `0003_init_ai_company_schema.sql`, `0005_project_registry.sql`, `0007_revenue_ledger.sql`, `0009_ceo_operating_system.sql` | Schema DDL | yes |

### 2.2 Layer 2 — `company-instance` (per-company configuration & connectors)

**Belongs in the instance:**

| Item | Why per-instance |
|---|---|
| Project list with slugs, names, descriptions | Each company has a different portfolio |
| `connectors/foodtruck-il/`, `connectors/lab-os/`, `connectors/inventory-engine/`, `connectors/whatsapp-engine/` | These connectors talk to *this* company's data sources |
| `packages/connectors/foodtruck-business/`, `packages/connectors/revenue/`, `packages/connectors/portfolio-intelligence/` | Same — instance-specific data adapters |
| Vendor lists per project (Wolt, Meta WhatsApp Cloud API, LIMS, …) | Each company has different vendor relationships |
| Marketing channel preferences per project | Each company has different go-to-market channels |
| `supabase/migrations/0002_seed.sql`, `0004_seed_ai_company_schema.sql`, `0006_seed_project_registry.sql`, `0008_seed_revenue_connectors.sql` | Seed data is by definition per-instance |
| Branded copy in dashboard pages (page titles, hero copy) | Each company has its own branding |
| `.env.local` (Supabase project, Anthropic key, FoodTruck credentials, etc.) | Per-instance secrets |

---

## 3. How the layers communicate

The platform exposes three integration surfaces. The instance fills them in.

### 3.1 Connector registry (`@ai-company/connector-framework`)

The platform exports `ConnectorRegistry` and `SyncOrchestrator`. The instance constructs its own connectors and calls `registry.register(connector)`. The platform's dashboard, executive packages, and sync routes all walk the registry — they never name an individual connector.

**Today's leak:** `apps/executive-dashboard/lib/platform.ts` imports `FoodTruckIlConnector`, `LabOsConnector`, `InventoryEngineConnector`, `WhatsAppEngineConnector` by name. Should instead invoke a single instance-supplied `registerInstanceConnectors(registry, env)` callback.

### 3.2 Company config (`company.config.ts` — to be created)

A typed config file at the instance root that the platform reads on boot. Suggested shape (illustrative, not implemented):

```ts
export interface CompanyConfig {
  /** Human display name for the company. */
  companyName: string;
  /** Optional brand tagline shown in the dashboard header. */
  tagline?: string;
  /** Project definitions seeded into the registry on first boot. */
  projects: Array<{
    slug: string;
    name: string;
    description: string;
    /** Vendor relationships this project depends on. Used by AI COO. */
    vendors?: string[];
    /** Preferred marketing channels for this project. Used by AI VP Marketing. */
    marketingChannels?: MarketingChannel[];
  }>;
  /** Optional per-executive prompt overrides. Platform supplies defaults. */
  promptOverrides?: Partial<Record<ExecutiveId, string>>;
}
```

The Fake LLM clients that today hardcode `PROJECT_VENDORS` and `PROJECT_CHANNEL_HINTS` would read these from the config-resolved `CompanyContext.projects[i].vendors` / `.marketingChannels` instead.

### 3.3 Instance-supplied seed migrations

The platform ships schema-only migrations (`0001`, `0003`, `0005`, `0007`, `0009`). The instance ships seed migrations (`0002`, `0004`, `0006`, `0008`) in its own folder. The instance's CI/CD applies platform migrations first, then instance migrations.

When the platform is split into a separate repo or package, the instance imports the platform migrations as a peer artifact and chains them.

---

## 4. Decision rules for new code

Before writing or reviewing any code, run this checklist:

1. **Does the file live under `packages/` or `apps/executive-dashboard/` (the shell)?** If yes, it's platform layer — no instance-specific strings allowed.
2. **Does the file live under `connectors/`, `packages/connectors/`, or in a migration with "seed" in the name?** If yes, it's instance layer — instance-specific strings are fine.
3. **Would a different AI-Native company (e.g., a SaaS firm, a holding company, an agency) be served by this code unchanged?** If no, you've found a leak.
4. **Does the prompt or fixture mention `FoodTruck-IL`, `Lab-OS`, `BurgerStop`, `ILS`, `Wolt`, etc.?** Replace with pattern-based logic or move into the instance.
5. **When the file you're editing names a specific project, ask: where would I look to swap it out for a different one?** If the answer isn't a config file or a connector package, you've found a leak.

---

## 5. Acceptance signal for "platform is generic"

We will know the boundary is enforced when:

1. **A fresh clone for "AcmeCo" works as follows:**
   - Fork the repo.
   - Delete `connectors/foodtruck-il/`, `lab-os/`, `inventory-engine/`, `whatsapp-engine/`.
   - Delete `packages/connectors/foodtruck-business/`, `revenue/`, `portfolio-intelligence/`.
   - Delete `supabase/migrations/000{2,4,6,8}_*.sql`.
   - Replace `company.config.ts` with AcmeCo's projects and connectors.
   - Run `pnpm install && pnpm -r build && pnpm dev`.
   - **Zero edits required under `packages/` or to platform migration files.**

2. **`grep -r foodtruck packages/` returns zero matches.**
3. **`grep -r 'wolt\|paybox\|lims\|meta whatsapp' -i packages/` returns zero matches.**
4. **Each platform package's `README.md` (when written) describes its inputs/outputs in terms of `Project` / `ProjectMetric` / `Risk` / `Opportunity` — never naming a specific project.**

These are the checkpoints the refactor plan drives toward.

---

## 6. What this document is NOT

- **Not** a refactor — no code moves until the plan is accepted.
- **Not** a re-architecture — the existing `Executive<TOutput>` / `DataConnector` / `Repositories` contracts are already correctly generic. The leak is in the concrete data baked alongside them.
- **Not** a rejection of the current portfolio — FoodTruck-IL / Lab-OS / Inventory Engine / WhatsApp Platform / BurgerStop remain the *instance's* projects. The goal is making them clearly *belong to the instance*, not the platform.

See `docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md` for the migration steps.
