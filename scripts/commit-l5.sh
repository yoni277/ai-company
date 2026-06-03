#!/usr/bin/env bash
# Commit L5: remove the four instance connector dependencies from the
# dashboard app's package.json. They live on the instance workspace package
# (instances/yoni-company/package.json, named @ai-company/instance-yoni-company)
# now, and the dashboard reaches them transitively via pnpm's resolution.
#
# Run from the repo root: `bash scripts/commit-l5.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

# L5 acceptance guard — fail if any instance connector dep remains in
# apps/executive-dashboard/package.json. The four are:
#   @ai-company/connector-foodtruck-il
#   @ai-company/connector-lab-os
#   @ai-company/connector-inventory-engine
#   @ai-company/connector-whatsapp-engine
echo "=== L5 acceptance: dashboard package.json has no instance connector deps ==="
if grep -E "@ai-company/connector-(foodtruck-il|lab-os|inventory-engine|whatsapp-engine|burgerstop)" \
    apps/executive-dashboard/package.json; then
  echo "FAIL: instance connector deps still present in apps/executive-dashboard/package.json"
  exit 1
fi
echo "PASS"

# Sanity: confirm the instance package still declares them. Without this,
# pnpm wouldn't link the connectors anywhere reachable from the
# instance-connectors.ts compile graph.
echo
echo "=== Sanity: instance package.json declares the four connectors ==="
missing=0
for pkg in connector-foodtruck-il connector-lab-os connector-inventory-engine connector-whatsapp-engine; do
  if ! grep -q "\"@ai-company/$pkg\"" instances/yoni-company/package.json; then
    echo "FAIL: instances/yoni-company/package.json missing @ai-company/$pkg"
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then exit 1; fi
echo "PASS"

# Stage the package.json change. Also stage the lockfile if pnpm-lock.yaml
# moved (the user is expected to have run `corepack pnpm install` before
# running this script, which updates the lockfile to reflect both the new
# instance workspace package and the dropped dashboard deps).
git add apps/executive-dashboard/package.json scripts/commit-l5.sh
if [ -f pnpm-lock.yaml ]; then
  git add pnpm-lock.yaml || true
fi
# The instance package.json itself is also part of this refactor's surface
# area — stage it whether or not it was committed in an earlier turn (idempotent).
git add instances/yoni-company/package.json || true

git commit -m "refactor(dashboard): remove instance connector dependencies from dashboard package

L5 from docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md. The
dashboard's package.json used to declare the four instance-specific
DataConnector packages — foodtruck-il, lab-os, inventory-engine,
whatsapp-engine — even though only the instance layer (now at
instances/yoni-company/) actually imports them.

Changes:
- apps/executive-dashboard/package.json
  - Removes the four instance-specific connector workspace deps.
  - Kept: connector-framework (generic), connector-github (generic),
    connector-supabase (generic), connector-foodtruck-business,
    connector-portfolio-intelligence, connector-revenue. These are still
    imported by dashboard-owned code (lib/owner-acquisition.ts,
    lib/portfolio-intelligence.ts, etc.); their removal is part of a
    future L1-follow-up that moves those instance-touching lib files
    out of the dashboard.
- instances/yoni-company/package.json
  - Already declares the four connectors as workspace:* deps (set up in
    a prior step). This commit's acceptance check guards that it still does.
- pnpm-lock.yaml
  - Regenerated to reflect the moved deps.

Resolution mechanics:
- The dashboard bundles instances/yoni-company/instance-connectors.ts
  via the '@active-instance/*' tsconfig path alias.
- That file imports '@ai-company/connector-foodtruck-il' etc.
- pnpm installs those into instances/yoni-company/node_modules/ because
  the instance package.json declares them.
- Next/Turbopack walks up from instance-connectors.ts → finds the deps
  in the local node_modules. No transpile-list change needed.

Constraints honoured:
- No connector package folders moved (still under packages/connectors/ and
  connectors/) — that's a later step.
- No runtime behaviour change. Same four connectors register in the same
  order via buildInstanceConnectors(env).
- Generic packages untouched.

Verified:
  grep -E '@ai-company/connector-(foodtruck-il|lab-os|inventory-engine|whatsapp-engine|burgerstop)' \\
    apps/executive-dashboard/package.json → 0 matches.
  Instance package.json declares all four → confirmed by sanity check above.

Smoke (host):
  pnpm install (already executed)
  pnpm -C apps/executive-dashboard typecheck
  pnpm -C apps/executive-dashboard build
  Visit /, /ceo, /registry; /api/projects returns same 4 entries."

echo
echo "Done. Recent log:"
git log --oneline | head -5
