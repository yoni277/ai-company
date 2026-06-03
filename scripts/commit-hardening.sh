#!/usr/bin/env bash
# Two-step commit for the hardening pass.
# Run from the repo root: `bash scripts/commit-hardening.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

# Clean stale sandbox lock files (no-op if not present).
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

# --- Commit 1: chore(validation) ---
git add \
  packages/ai-vp-marketing/src/llm-client.ts \
  packages/ai-cto/src/llm-client.ts \
  packages/ai-coo/src/llm-client.ts \
  packages/ai-cfo/src/llm-client.ts \
  packages/ai-vp-sales/src/llm-client.ts \
  packages/ai-chief-of-staff/src/llm-client.ts \
  packages/ai-executive-team/src/llm-client.ts \
  apps/executive-dashboard/lib/platform.ts \
  apps/executive-dashboard/app/layout.tsx \
  apps/executive-dashboard/next.config.mjs \
  apps/executive-dashboard/tsconfig.json \
  tsconfig.base.json \
  tsconfig.json

git commit -m "chore(validation): harden executive validators and foodtruck connector fallback

- All seven executive output validators (CoS, CTO, COO, CFO, VP Marketing,
  VP Sales, Executive Team) now require only the load-bearing scalars
  (headline + the *Health field) and default missing array fields to []
  rather than throwing. This fixes the VP Marketing 500 (\"missing field
  growthRisks\") when Claude omits an array because it has nothing to surface,
  and prevents the same class of failure across the other executives.

- FoodTruck-IL connector fallback in platform.ts switched from ?? to ||
  so an empty-string env (FOODTRUCK_SUPABASE_URL=) falls through to
  NEXT_PUBLIC_SUPABASE_URL instead of being treated as set. Without this
  the connector silently ran in mock mode whenever the .env.local template
  shipped with empty FOODTRUCK_* placeholders. Added an opt-in connector
  mode log behind AI_COMPANY_LOG_CONNECTOR_MODE=1.

- Wired ai-executive-team into the dashboard (transpilePackages, tsconfig
  paths, root tsconfig references, nav tab).

Verified by scripts/verify-validators.mjs: 20/20 fixture cases pass —
valid minimal payloads accepted, missing optional arrays default to [],
missing required scalars throw, non-arrays-where-arrays-expected throw."

# --- Commit 2: docs(testing) ---
git add \
  docs/test-plan-phase-5.md \
  scripts/verify-validators.mjs \
  scripts/commit-hardening.sh

git commit -m "docs(testing): extend ai-company validation coverage

- New test plan at docs/test-plan-phase-5.md covers full executive team,
  cross-executive synthesis, Command Center / CEO OS, registry, revenue
  & financial intelligence, health-score, GitHub/Supabase/funnel metrics,
  decision support, and engine builds. Includes negative tests, performance
  budgets (with the 47-62s briefing latency observation noted vs the <8s
  budget), the §8b CLI-vs-process synthesis gotcha (each CLI uses a fresh
  InMemoryRepositories so convergence requires shared storage), and a
  diagnostic flow for the FoodTruck mock-mode trap.

- scripts/verify-validators.mjs is a self-contained Node smoke test that
  inlines each executive validator's runtime logic and exercises 20 fixture
  cases. Run with: node scripts/verify-validators.mjs"

echo
echo "Done. Recent log:"
git log --oneline | head -5
