#!/usr/bin/env bash
# Commit the auxiliary scripts that have accumulated during the
# generic-platform refactor (commit-*.sh, rollback-*.sh, verify-*.mjs).
#
# Run from the repo root: `bash scripts/commit-refactor-scripts.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

git add \
  scripts/commit-hardening.sh \
  scripts/commit-l1.sh \
  scripts/commit-l7.sh \
  scripts/commit-validator-strictness.sh \
  scripts/rollback-l5.sh \
  scripts/verify-validators.mjs

git commit -m "chore(scripts): collect generic-platform refactor commit helpers

Tooling that accumulated alongside the L1/L7/L9/L5/L6/L4 refactor steps
and the post-refactor validator hardening. Each script is independent
and idempotent; safe to run at any time:

- scripts/commit-hardening.sh — initial validator hardening pass (CFO,
  VP Marketing, etc. — landed when L1 was being prepared).
- scripts/commit-l1.sh — L1 commit (Chief of Staff no longer imports
  connector-foodtruck-business). Also wipes packages/ai-chief-of-staff
  and packages/shared-types dist + tsconfig.tsbuildinfo to prevent
  tsc -b drift after the export surface changed.
- scripts/commit-l7.sh — L7 commit (split supabase/migrations into
  platform/ + instance/).
- scripts/commit-validator-strictness.sh — landed the NonNullable<...>
  casts in CFO and VP Sales validators that exactOptionalPropertyTypes
  caught after L1.
- scripts/rollback-l5.sh — restores the four instance connector deps to
  apps/executive-dashboard/package.json if L5's resolution proves fragile.
  Idempotent.
- scripts/verify-validators.mjs — self-contained Node smoke test that
  inlines each executive validator's runtime logic and exercises 20
  fixture cases. Run with: node scripts/verify-validators.mjs"

echo
echo "Done. Recent log:"
git log --oneline | head -5
