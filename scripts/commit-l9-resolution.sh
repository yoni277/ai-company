#!/usr/bin/env bash
# Commit the L9 follow-up resolution fixes.
#
# Background: L9 moved instance-connectors.ts + instance-seed.ts under
# `instances/yoni-company/` and pointed at them via the wildcard tsconfig
# path alias `@active-instance/*`. That worked for TypeScript's resolver
# but Turbopack didn't honour the wildcard, and Next failed to resolve the
# imports at build time. This commit lands the four file changes that make
# resolution actually work end-to-end.
#
# Run from the repo root: `bash scripts/commit-l9-resolution.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

git add \
  apps/executive-dashboard/next.config.mjs \
  apps/executive-dashboard/tsconfig.json \
  apps/executive-dashboard/lib/platform.ts \
  pnpm-workspace.yaml

git commit -m "refactor(instance): make instance-dir resolution work end-to-end

L9 follow-up. After moving instance-connectors.ts + instance-seed.ts under
instances/yoni-company/ in commit \$(L9 hash), TypeScript resolved the
imports via the wildcard '@active-instance/*' path alias but Turbopack
didn't, so Next build failed to find the modules. This commit lands the
four file changes that make resolution work in both the TS server and
the Next/Turbopack build.

Changes:
- apps/executive-dashboard/next.config.mjs
  - Adds turbopack.resolveAlias entries mapping
    '@active-instance/instance-seed' and '@active-instance/instance-connectors'
    to repo-relative paths. Turbopack rejects absolute paths here ('server
    relative imports' error) so these are deliberately relative.
  - Factors out repoRoot = path.resolve(__dirname, '../..') for clarity.
  - Adds @ai-company/ai-executive-team to transpilePackages (was missing).

- apps/executive-dashboard/tsconfig.json
  - Adds baseUrl: '.' to anchor the path map.
  - Replaces the wildcard '@active-instance/*' mapping with two explicit
    entries (instance-seed + instance-connectors). Explicit beats wildcard
    for IDE go-to-definition and avoids edge-case TS resolution flakiness.
  - Adds explicit '@ai-company/connector-foodtruck-il' / lab-os /
    inventory-engine / whatsapp-engine path mappings, because under
    strict pnpm + tsc the connectors aren't always reachable from the
    dashboard's node_modules tree (they live under
    instances/yoni-company/node_modules now, per L5).

- apps/executive-dashboard/lib/platform.ts
  - Imports DataConnector type from connector-framework and uses it on
    the filter callback param so TS can infer through the slug-agnostic
    AI_COMPANY_ACTIVE_CONNECTORS filter.

- pnpm-workspace.yaml
  - Adds 'instances/*' to the workspace globs so pnpm discovers
    instances/yoni-company/ as a workspace package (carries the four
    connector deps after L5).

Behaviour preserved:
- Same four connectors register in the same order.
- /, /ceo, /registry render the same projects.
- /api/projects returns the same 4 entries."

echo
echo "Done. Recent log:"
git log --oneline | head -5
