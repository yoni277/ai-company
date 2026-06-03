#!/usr/bin/env bash
# L8 — Move the project-registry seed (hardcoded company/project names,
# slugs, funnel stages, connector configs, and mock revenue figures) out of
# packages/project-registry and into the instance layer.
#
# Before: packages/project-registry/src/seed-data.ts named FoodTruck-IL,
# Lab-OS, Inventory Engine, BurgerStop, their funnel stages, their
# foodtruck-business / mock-funnel connector configs, the ILS/USD mock
# revenue figures, and a `hasFoodTruckCredentials()` helper that reached
# directly for FOODTRUCK_SUPABASE_* env vars. Cloning the platform for a
# different company therefore required editing platform package code.
#
# After: the platform package exports `registerInstanceRegistrySeed(builder)`.
# The instance layer (instances/yoni-company/project-registry-seed.ts) holds
# the full builder and registers it at module-load time from
# apps/executive-dashboard/lib/platform.ts. The platform package no longer
# names any company, project, or connector type.
#
# Run from the repo root: `bash scripts/commit-l8.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

# Wipe stale tsbuildinfo so tsc -b picks up the seed-data.ts rewrite and the
# new exported symbols on project-registry's public surface.
rm -f \
  packages/project-registry/tsconfig.tsbuildinfo \
  packages/project-registry/dist/*.tsbuildinfo \
  2>/dev/null || true

git add \
  packages/project-registry/src/seed-data.ts \
  packages/project-registry/src/index.ts \
  instances/yoni-company/project-registry-seed.ts \
  instances/yoni-company/package.json \
  apps/executive-dashboard/lib/platform.ts \
  apps/executive-dashboard/tsconfig.json \
  apps/executive-dashboard/next.config.mjs \
  scripts/commit-l8.sh

if ! git diff --cached --quiet; then
  git commit -m "refactor(project-registry): move seed data to instance layer

L8 of the generic-platform refactor. The project-registry package no longer
hardcodes a company, project list, funnel stages, connector configs, or mock
revenue figures. Those moved to the instance layer.

Changes:
- packages/project-registry/src/seed-data.ts
  Replaced the hardcoded defs/funnels/connectors blocks (and the
  hasFoodTruckCredentials helper) with a module-level setter
  \`registerInstanceRegistrySeed(builder)\`. \`buildInMemoryRegistrySeed()\`
  now returns whatever the registered builder produces, or \`[]\` when
  nothing has been registered. The platform package never names a project.

- packages/project-registry/src/index.ts
  Re-exports \`registerInstanceRegistrySeed\`, \`__resetInstanceRegistrySeed\`,
  and the \`InstanceRegistrySeedBuilder\` type so the instance layer can
  consume them from the package public API.

- instances/yoni-company/project-registry-seed.ts (new)
  Owns the full four-project builder verbatim from the old seed-data.ts:
  FoodTruck-IL / Lab-OS / Inventory Engine / BurgerStop, their funnel
  stages, their foodtruck-business / mock-funnel connector configs,
  the ILS/USD mock revenue figures, and the FOODTRUCK_SUPABASE_* env
  fallback. Cloning the platform for a different company means editing
  this file (or pointing the @active-instance/project-registry-seed alias
  at a different one), not packages/project-registry.

- instances/yoni-company/package.json
  Adds \`@ai-company/shared-types\` workspace dep so the type import in
  project-registry-seed.ts resolves under strict pnpm.

- apps/executive-dashboard/lib/platform.ts
  Imports \`buildInstanceRegistrySeed\` from
  @active-instance/project-registry-seed and calls
  \`registerInstanceRegistrySeed(buildInstanceRegistrySeed)\` at module
  load time, before any caller invokes \`ProjectRegistryService.loadProjects()\`.

- apps/executive-dashboard/tsconfig.json
  Adds explicit \`@active-instance/project-registry-seed\` path mapping
  alongside the existing instance-seed / instance-connectors entries.

- apps/executive-dashboard/next.config.mjs
  Adds matching Turbopack \`resolveAlias\` entry (Turbopack does not honour
  wildcard tsconfig paths, same pattern used for L9).

No behaviour change:
- Same four projects (FoodTruck-IL, Lab-OS, Inventory Engine, BurgerStop)
  register with the same definitions, funnels, and connector configs.
- Supabase mode still wins over the in-memory builder.
- Mock mode still produces the same projects (foodtruck-il liveCapable=true
  when FOODTRUCK_SUPABASE_* env vars are set).
- ProjectRegistryService.loadAndValidate() returns the same shape."
else
  echo '[l8] no changes to commit'
fi

echo
echo "Done. Recent log:"
git log --oneline | head -5
