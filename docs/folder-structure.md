# Folder Structure

```
ai-company/
├── apps/
│   └── executive-dashboard/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                       # Overview
│       │   ├── projects/
│       │   │   ├── page.tsx
│       │   │   └── [slug]/page.tsx
│       │   ├── reports/
│       │   │   ├── page.tsx
│       │   │   └── [id]/page.tsx
│       │   ├── chief-of-staff/page.tsx
│       │   ├── api/
│       │   │   ├── projects/route.ts
│       │   │   ├── reports/route.ts
│       │   │   ├── connectors/route.ts
│       │   │   ├── connectors/sync/route.ts
│       │   │   └── chief-of-staff/briefing/route.ts
│       │   └── globals.css
│       ├── components/
│       ├── lib/
│       │   ├── platform.ts                    # wires connectors + repos + executives
│       │   └── format.ts
│       ├── next.config.mjs
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── tailwind.config.ts
│       └── tsconfig.json
│
├── packages/
│   ├── shared-types/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── projects.ts
│   │   │   ├── metrics.ts
│   │   │   ├── risks.ts
│   │   │   ├── opportunities.ts
│   │   │   ├── reports.ts
│   │   │   ├── connector.ts
│   │   │   └── executive.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── database/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── client.ts                      # createRepositories(env)
│   │   │   ├── repositories.ts                # interfaces
│   │   │   ├── supabase-repositories.ts
│   │   │   ├── in-memory-repositories.ts
│   │   │   └── generated-types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── connector-framework/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── connector.ts                   # DataConnector interface
│   │   │   ├── registry.ts
│   │   │   ├── sync-orchestrator.ts
│   │   │   ├── normalize.ts
│   │   │   └── errors.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ai-chief-of-staff/
│       ├── src/
│       │   ├── index.ts
│       │   ├── executive.ts                   # Executive impl
│       │   ├── context.ts                     # buildCompanyContext
│       │   ├── llm-client.ts                  # OpenAI wrapper
│       │   ├── fake-llm-client.ts             # deterministic, for tests + mock mode
│       │   ├── prompts/
│       │   │   ├── daily-briefing.ts
│       │   │   └── weekly-report.ts
│       │   └── analyzers/
│       │       ├── health.ts
│       │       ├── risks.ts
│       │       └── opportunities.ts
│       ├── package.json
│       └── tsconfig.json
│
├── connectors/
│   ├── foodtruck-il/                          # all four follow the same shape
│   ├── lab-os/
│   ├── inventory-engine/
│   └── whatsapp-engine/
│       └── src/
│           ├── index.ts                       # exports Connector class
│           └── data.ts                        # canned sample data
│
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql
│       └── 0002_seed.sql
│
├── docs/
│   ├── architecture.md
│   ├── design-doc.md
│   ├── database-schema.md
│   ├── api-contracts.md
│   ├── folder-structure.md
│   └── roadmap.md
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
├── .gitignore
├── .nvmrc
├── .env.example
├── .prettierrc
└── README.md
```
