#!/usr/bin/env bash
# Final cleanup pass — lands the three remaining clusters of dangling work
# in three focused commits.
#
# Run from the repo root: `bash scripts/commit-cleanup.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

# ---------------------------------------------------------------------------
# Commit A — remaining validator hardening (5 of 7 executive validators).
# CFO + VP Sales already landed in 6e3b67b. This commit lands the rest.
# ---------------------------------------------------------------------------
git add \
  packages/ai-chief-of-staff/src/llm-client.ts \
  packages/ai-coo/src/llm-client.ts \
  packages/ai-cto/src/llm-client.ts \
  packages/ai-vp-marketing/src/llm-client.ts \
  packages/ai-executive-team/src/llm-client.ts

if ! git diff --cached --quiet; then
  git commit -m "chore(validation): harden remaining executive output validators

The CFO and VP Sales validators were hardened in 6e3b67b. This commit
applies the same pattern to the other five executive output validators:

- Chief of Staff
- COO
- CTO
- VP Marketing
- Executive Team (board digest)

Each validator now requires only the load-bearing scalar fields
(headline + the *Health field) and defaults missing array fields to []
rather than throwing. This is what fixed the VP Marketing 500
('missing field growthRisks') and prevents the same class of failure
across every other executive when Claude omits an empty-but-valid array.

Verified by scripts/verify-validators.mjs (in a397b11):
  20/20 fixture cases pass — valid minimal payloads accepted, missing
  optional arrays default to [], missing required scalars throw,
  non-arrays-where-arrays-expected throw."
else
  echo '[cleanup] no validator changes to commit'
fi

# ---------------------------------------------------------------------------
# Commit B — accumulated executive wiring catch-up.
# Across L1/L4/L9 sessions, multiple session-locks prevented these files
# from being staged. They were edited but never reached git.
# ---------------------------------------------------------------------------
git add \
  apps/executive-dashboard/app/layout.tsx \
  apps/executive-dashboard/next-env.d.ts \
  tsconfig.base.json \
  tsconfig.json

if ! git diff --cached --quiet; then
  git commit -m "chore(dashboard): land accumulated executive-team wiring

These four files accumulated edits across the AI CTO / VP Marketing /
COO / CFO / VP Sales / Executive Team build-out (tasks 16, 19, 22, 25,
28 in the running task list). Each edit was a one-line additive — a
nav entry, a path mapping, a project reference — but sandbox .git lock
issues prevented earlier sessions from staging them.

Files:
- apps/executive-dashboard/app/layout.tsx
  Six nav tabs added across sessions: AI CTO, AI COO, AI CFO,
  AI VP Marketing, AI VP Sales, AI Executive Team.
- apps/executive-dashboard/next-env.d.ts
  Next 16 auto-regenerated import for the typedRoutes type file.
- tsconfig.base.json
- tsconfig.json (root)
  Path aliases and project references for the six executive packages
  built between L1 and L9.

No behaviour change; this is git-state housekeeping."
else
  echo '[cleanup] no executive-wiring changes to commit'
fi

# ---------------------------------------------------------------------------
# Commit C — boundary documentation and the two meta commit scripts that
# themselves landed earlier refactor commits.
# ---------------------------------------------------------------------------
git add \
  docs/architecture/GENERIC_PLATFORM_BOUNDARY.md \
  docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md \
  docs/test-plan-phase-5.md \
  scripts/commit-l9-resolution.sh \
  scripts/commit-refactor-scripts.sh \
  scripts/commit-cleanup.sh

if ! git diff --cached --quiet; then
  git commit -m "docs: generic-platform boundary, refactor plan, and remaining tooling

Lands the documentation produced during the generic-platform refactor
and the commit-helper scripts that escaped earlier batch commits.

Docs:
- docs/architecture/GENERIC_PLATFORM_BOUNDARY.md
    Two-layer architecture: 'ai-company-platform' (reusable across N
    companies) vs 'company-instance' (per-company config/connectors).
    Lists which packages live where and the rules for staying in
    each layer.
- docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md
    The 12 leaks (L1-L12) with severity, target, migration steps, and
    no-behaviour-change acceptance tests. L1, L4, L5, L6, L7, L9 are
    now landed; L2, L3, L8, L10, L11, L12 remain queued.
- docs/test-plan-phase-5.md
    10-section validation plan including Command Center, CEO OS,
    revenue/financial intelligence, performance budgets, and negative
    tests.

Scripts:
- scripts/commit-l9-resolution.sh — landed cf60086.
- scripts/commit-refactor-scripts.sh — landed a397b11.
- scripts/commit-cleanup.sh — this script."
else
  echo '[cleanup] no docs/meta changes to commit'
fi

echo
echo "Done. Recent log:"
git log --oneline | head -8
