#!/usr/bin/env bash
# Commit the exactOptionalPropertyTypes fixes for CFO + VP Sales validators.
# These two assignments were caught the first time pnpm -r typecheck was run
# against the post-L1 source.
#
# Run from the repo root: `bash scripts/commit-validator-strictness.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

git add \
  packages/ai-cfo/src/llm-client.ts \
  packages/ai-vp-sales/src/llm-client.ts

git commit -m "chore(validation): tighten optional-field casts under exactOptionalPropertyTypes

The platform's tsconfig.base.json sets exactOptionalPropertyTypes: true,
which forbids assigning 'undefined' to an optional field. The CFO and VP
Sales validators were narrowing v.cashSnapshot / v.forecastSummary via
truthiness, then assigning them as the **optional** field type — TS read
that as 'maybe undefined' and rejected the assignment.

Fix: cast through NonNullable<...> on the assignment so TS sees the
present value as the inner shape (never undefined). Same runtime
behaviour — the assignment is already gated on a truthy + typeof-object
check.

Affected:
- packages/ai-cfo/src/llm-client.ts (cashSnapshot)
- packages/ai-vp-sales/src/llm-client.ts (forecastSummary)

Caught by: pnpm -r typecheck after L1 + L7.
No runtime change. No new tests required."

echo
echo "Done. Recent log:"
git log --oneline | head -5
