# Phase 1 Technical Design Document

## Goal

Ship the AI Chief of Staff as the first executive on a foundation that the AI CTO / CFO / COO / VP Marketing / VP Sales will plug into without refactoring.

## Non-goals

- Action-taking. Advisory only.
- Production-grade auth or multi-tenant.
- Live data connectors. Phase 1 uses mocks.

## 1. Package layout

```
ai-company/
├── apps/
│   └── executive-dashboard/          # Next.js 16 + React 19 + Tailwind v4
├── packages/
│   ├── shared-types/                 # Domain interfaces
│   ├── database/                     # Supabase client + Repositories + in-memory mock
│   ├── connector-framework/          # DataConnector contract + registry + orchestrator
│   └── ai-chief-of-staff/            # Advisory executive service
├── connectors/
│   ├── foodtruck-il/                 # Mock
│   ├── lab-os/                       # Mock
│   ├── inventory-engine/             # Mock
│   └── whatsapp-engine/              # Mock
├── supabase/
│   └── migrations/                   # SQL schema
└── docs/
```

## 2. Contracts (the load-bearing ones)

### 2.1 `DataConnector`

```ts
export interface DataConnector {
  readonly name: string;                  // unique, stable; used as data_source key
  readonly projectSlug: string;           // 1:1 with projects.slug
  readonly displayName: string;
  getStatus(): Promise<ProjectStatusSnapshot>;
  getMetrics(): Promise<ProjectMetric[]>;
  getRisks(): Promise<RiskCandidate[]>;
  getOpportunities?(): Promise<OpportunityCandidate[]>;
  healthCheck?(): Promise<ConnectorHealth>;
}
```

Connectors return **candidates**, not persisted entities. The framework decides whether they become rows in `risks` / `opportunities`.

### 2.2 `Repositories`

```ts
export interface Repositories {
  projects: ProjectRepository;
  dataSources: DataSourceRepository;
  metrics: ProjectMetricRepository;
  risks: RiskRepository;
  opportunities: OpportunityRepository;
  reports: ExecutiveReportRepository;
}
```

Two implementations: `SupabaseRepositories`, `InMemoryRepositories`. Selected by `AI_COMPANY_DATA_MODE`.

### 2.3 `Executive`

```ts
export interface Executive<TOutput> {
  readonly id: string;                    // "chief-of-staff", "cto", …
  readonly displayName: string;
  generateReport(ctx: CompanyContext): Promise<TOutput>;
}
```

The Chief of Staff is the first implementation; future executives extend the registry without changing anything above.

## 3. AI Chief of Staff workflow

```
collect()                 ← Repositories
   ↓
buildCompanyContext()     ← cross-project rollups, freshness, deltas
   ↓
callLlm(prompt, ctx)      ← OpenAI structured output
   ↓
persistReport(output)     ← executive_reports + linked risks/opportunities
   ↓
return output             ← consumed by /api/chief-of-staff and dashboard
```

The prompt is template-driven (`prompts/`). The LLM call uses JSON schema response format to guarantee `ChiefOfStaffOutput` shape; any deviation throws and the run is logged to `data_sources` with status `degraded`.

## 4. Data flow into the dashboard

- Server components call `getRepositories()` directly. No client-side data fetching for read paths.
- `POST /api/chief-of-staff/briefing?type=daily|weekly` triggers a fresh generation and returns the new report.
- `POST /api/connectors/sync` invokes `SyncOrchestrator.runAll()`.

## 5. Failure model

| Failure | Effect |
| --- | --- |
| Single connector throws | `data_sources.status='error'`, other connectors proceed |
| LLM returns invalid JSON | Report not persisted, error surfaced in dashboard banner |
| Supabase unreachable | If `AI_COMPANY_DATA_MODE=mock`, no impact. Otherwise hard error in API route. |

## 6. Why these choices

- **pnpm workspaces** over Nx/Turborepo: minimum tooling for the size we're at; Turborepo can be added in Phase 2 if build times warrant.
- **Repositories interface over direct Supabase calls** in services: makes the in-memory mock real and lets us swap to Postgres-direct later without touching `ai-chief-of-staff`.
- **OpenAI structured outputs** over free-form parsing: failures are deterministic; the contract `ChiefOfStaffOutput` is the spec.
- **Mock connectors as separate workspace packages** rather than fixtures inside the framework: they validate that the connector contract is actually pluggable from the outside.

## 7. Testing strategy (Phase 1)

- `shared-types`: type-only, no runtime tests.
- `connector-framework`: unit tests around registry, retry, normalization.
- `ai-chief-of-staff`: unit tests with a `FakeLlmClient` returning canned `ChiefOfStaffOutput`.
- Mock connectors: snapshot tests on `getStatus/getMetrics/getRisks`.
- Dashboard: smoke-render server components against `InMemoryRepositories`.

## 8. Phase 1 acceptance

The CEO can:

1. Open the dashboard against mock data and see all four projects with health, risks, opportunities.
2. Click "Generate daily briefing" and receive a typed report grounded in current mock data.
3. View the report on the Reports tab and CoS recommendations on the Chief of Staff tab.
4. Replace any mock connector with a real one without changing the dashboard or the Chief of Staff.
