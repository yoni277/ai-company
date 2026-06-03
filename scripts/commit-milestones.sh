#!/usr/bin/env bash
# Run from the repo root. Creates the remaining Phase 1 milestone commits.
# Commit 1 (foundation) was already made during scaffolding.
set -euo pipefail
cd "$(dirname "$0")/.."

# Clean any stale lock files from the scaffold session.
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

git add packages/shared-types/ packages/database/ packages/connector-framework/
git commit -m "Phase 1 milestone 2/5: shared-types + database + connector-framework

- @ai-company/shared-types: Project, ProjectMetric, Risk, Opportunity, ExecutiveReport, DataConnector, Executive, ChiefOfStaffOutput
- @ai-company/database: Repositories interface + Supabase + in-memory implementations, env-driven factory
- @ai-company/connector-framework: ConnectorRegistry, SyncOrchestrator with per-connector timeouts and failure isolation"

git add packages/ai-chief-of-staff/
git commit -m "Phase 1 milestone 3/5: AI Chief of Staff service

- Executive contract implementation: collect → context → LLM → store
- OpenAI structured-output client + deterministic FakeLlmClient fallback
- Daily briefing and weekly report prompts with shared schema
- Persists new risks/opportunities with source = executive:chief-of-staff
- CLI runner for smoke-testing without the dashboard"

git add connectors/
git commit -m "Phase 1 milestone 4/5: mock connectors for the four Phase 1 projects

- FoodTruck-IL, Lab-OS, Inventory Engine, WhatsApp Platform
- Each implements DataConnector with realistic mock metrics, risks, opportunities
- Zero project-specific code outside its own package — swap any one with a live integration without touching the framework"

git add apps/executive-dashboard/ scripts/
git commit -m "Phase 1 milestone 5/5: Executive Dashboard (Next.js 16 + React 19 + Tailwind v4)

- Overview, Projects (list + detail), Reports (list + detail), AI Chief of Staff tabs
- Route handlers: /api/projects, /api/reports, /api/connectors, /api/connectors/sync, /api/chief-of-staff/briefing
- Server-component data fetching via Repositories; dashboard runs against in-memory or Supabase with no code change
- Sync + Briefing buttons trigger orchestrator and Chief of Staff from the UI"

echo
echo "Done. Milestones:"
git log --oneline
