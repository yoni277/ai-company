# AI-Company

The operating system for an AI-Native company.

This repository is the foundation for a platform that will eventually be run by a team of AI executives (CTO, CFO, COO, VP Marketing, VP Sales). **Phase 1 ships only the first executive: the AI Chief of Staff**, plus the Executive Dashboard and the multi-project foundation that everything else will build on.

Treat this codebase as the operating system for all businesses owned by the CEO. Every decision optimizes for extensibility, multi-project support, and future AI executive roles — not for any one project's reporting needs.

## What's here today

| Layer | Package | Purpose |
| --- | --- | --- |
| App | `apps/executive-dashboard` | Next.js 16 dashboard the CEO uses |
| Service | `packages/ai-chief-of-staff` | Advisory-only AI service: briefings, risks, opportunities, priorities |
| Framework | `packages/connector-framework` | Generic `DataConnector` contract + registry + sync orchestrator |
| Data | `packages/database` | Supabase client, repositories, in-memory mock for demo mode |
| Contracts | `packages/shared-types` | Cross-package domain types |
| Connectors | `connectors/*` | Mock connectors for FoodTruck-IL, Lab-OS, Inventory Engine, WhatsApp Engine |
| Schema | `supabase/migrations` | SQL migrations for the platform schema |
| Design | `docs/` | Architecture, design doc, schema, contracts, roadmap |

## Finishing the milestone commits

The foundation commit (`Phase 1 milestone 1/5`) is already in the repo. The remaining four commits could not be completed during scaffolding due to a sandbox filesystem permission quirk that left `.git/index.lock` undeletable. Run this once locally to land the rest:

```bash
bash scripts/commit-milestones.sh
```

Result: five clean milestone commits on `main`.

## Quick start (mock mode)

```bash
pnpm install
cp .env.example .env.local
# leave AI_COMPANY_DATA_MODE=mock to skip Supabase entirely
pnpm dev
```

Then open <http://localhost:3000>.

## Quick start (Supabase mode)

1. Apply `supabase/migrations/*.sql` to your Supabase project.
2. Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` in `.env.local`.
3. `AI_COMPANY_DATA_MODE=supabase`.
4. `pnpm dev`.

## Core principles

1. **Project-agnostic core.** The AI Chief of Staff never imports a project package directly. Everything goes through the connector framework.
2. **Advisory only.** Phase 1 cannot take actions, approve spend, or modify external systems. Recommendations are the only output.
3. **Extensible to future executives.** Each future AI executive will be added as a sibling package to `ai-chief-of-staff` that consumes the same connector data and writes its own report type.
4. **Multi-project from day one.** Every entity is namespaced by `project_id`. There is no "primary project."

## See

- [`docs/architecture.md`](docs/architecture.md) — system architecture
- [`docs/design-doc.md`](docs/design-doc.md) — Phase 1 technical design
- [`docs/database-schema.md`](docs/database-schema.md) — schema rationale
- [`docs/api-contracts.md`](docs/api-contracts.md) — TypeScript & HTTP contracts
- [`docs/roadmap.md`](docs/roadmap.md) — phase-by-phase plan
