# Roadmap

Phase 1 ships the foundation and one executive. Everything after is additive — no refactors required.

## Phase 1 — Foundation + AI Chief of Staff (this repo, today)

- Monorepo skeleton, contracts, schema.
- `connector-framework` with `DataConnector`, registry, sync orchestrator.
- `ai-chief-of-staff` with daily briefing, weekly report, risk/opportunity/priority generation.
- `executive-dashboard` with Overview, Projects, Reports, Chief of Staff tabs.
- Four mock connectors: FoodTruck-IL, Lab-OS, Inventory Engine, WhatsApp Engine.
- Supabase migrations applied manually; in-memory mode for instant demo.

Exit criteria: CEO opens dashboard, sees all four projects + a fresh AI CoS briefing, replaces one mock connector with a real one without touching the dashboard or service.

## Phase 2 — Live connectors + scheduling

- Replace mock connectors with live integrations (FoodTruck-IL first).
- Add background scheduler (cron via Vercel cron or Supabase scheduled functions) running sync every 15m and briefings daily at 06:00.
- Add observability: structured logs, per-connector latency, LLM token usage.
- Tighten Supabase RLS to per-user policies, add basic auth.

## Phase 3 — Second executive: AI CTO

- Add `packages/ai-cto/` implementing `Executive`.
- New report type: `engineering_health_report` (deploy frequency, incident MTTR, code review latency).
- Dashboard tab discovers the executive automatically via the executive registry.
- Validates that the executive contract is genuinely reusable.

## Phase 4 — Remaining executives

- AI CFO: cash, runway, burn, unit economics.
- AI COO: ops throughput, SLA adherence, vendor health.
- AI VP Marketing: funnel, CAC, channel attribution.
- AI VP Sales: pipeline, win rate, forecast.

Each ships as a sibling package + a new connector type or two.

## Phase 5 — Cross-executive synthesis

- Add `packages/ai-executive-team/` that synthesizes outputs from all executives into a board-level digest.
- Introduces the first inter-executive contract (executives reading each other's reports as context).

## Cross-cutting backlog

- Switch from pnpm scripts to Turborepo when build > 30s.
- Replace ad-hoc OpenAI client with a thin LLM abstraction (multi-provider) once a second provider is justified.
- Move LLM prompts into a versioned registry with eval harness (golden cases per executive).
- Webhook-style "push" connectors (in addition to today's pull model).
- Action-taking executives — gated, with explicit CEO approval flows. Out of scope until governance is designed.
