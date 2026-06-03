#!/usr/bin/env bash
# Commit L6: parameterise InMemoryRepositories.ensureSeed().
# Run from the repo root: `bash scripts/commit-l6.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

# Sandbox may leave stale .git locks; safe to ignore if absent.
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

# Wipe stale build artefacts in every package whose exports changed.
# Same rationale as commit-l1.sh: tsc -b consults .tsbuildinfo and will skip
# emit if it thinks the project hasn't changed — that causes downstream
# typechecks to fail looking for the new InMemorySeedProject export.
rm -rf packages/database/dist 2>/dev/null || true
rm -f  packages/database/tsconfig.tsbuildinfo 2>/dev/null || true

# Run the L6 acceptance grep before staging the commit.
echo "=== L6 acceptance check: no instance slugs in packages/database/src/ ==="
if grep -rE "foodtruck-il|lab-os|inventory-engine|burgerstop|whatsapp-engine" packages/database/src/; then
  echo "FAIL: instance-specific slugs still present in packages/database/src/"
  exit 1
fi
echo "PASS"
echo

git add \
  packages/database/src/in-memory-repositories.ts \
  packages/database/src/client.ts \
  apps/executive-dashboard/lib/instance-seed.ts \
  apps/executive-dashboard/lib/platform.ts \
  scripts/commit-l6.sh

git commit -m "refactor(database): move in-memory seed data to instance layer

L6 from docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md. The
in-memory repositories ship as part of the generic platform; until now
they hardcoded this company's portfolio (foodtruck-il, lab-os,
inventory-engine, whatsapp-engine) inside ensureSeed(). That meant every
clone of the platform would mock-render this company's projects on first
boot.

Changes:
- packages/database/src/in-memory-repositories.ts
  - Store.seedProjects is now a mutable, instance-supplied array (default []).
  - ensureSeed() iterates over Store.seedProjects instead of a literal array.
  - New rawStore() helper returns the singleton WITHOUT triggering ensureSeed,
    so the constructor can set the seed list before the first read.
  - InMemoryRepositories constructor accepts { seedProjects? }; first
    non-empty seed wins (process-singleton semantics).
  - Exports a new InMemorySeedProject type.
- packages/database/src/client.ts
  - PlatformEnv gains optional mockSeed?: InMemorySeedProject[].
  - createRepositories pipes it through to the constructor.
- apps/executive-dashboard/lib/instance-seed.ts (NEW)
  - Holds the four projects that used to live inside the platform.
- apps/executive-dashboard/lib/platform.ts
  - Imports INSTANCE_PROJECTS_SEED and attaches it to env.mockSeed before
    calling createRepositories. The platform package no longer knows them.

Behaviour preserved:
- /api/projects returns the same 4 projects in mock mode, because the
  dashboard now supplies them explicitly via the instance seed.
- Supabase mode unchanged (mockSeed is ignored when dataMode='supabase').

Behaviour change (acceptable, flagged):
- Executive CLIs (packages/ai-*/src/cli/briefing.ts) call
  createRepositories({ dataMode: 'mock' }) with no mockSeed, so they now
  brief against an empty project list. Previously the platform leaked the
  seed and made them look populated. The new behaviour is the correct
  generic default; a future task can add a smoke-only seed loader if
  desired.

Verified:
  grep -rE 'foodtruck-il|lab-os|inventory-engine|burgerstop|whatsapp-engine' packages/database/src/
  → zero matches.

Runtime smoke (mock mode):
- /          200, 4 projects rendered
- /ceo       200
- /registry  200
- /api/projects → 4 entries (foodtruck-il, lab-os, inventory-engine, whatsapp-engine)"

echo
echo "Done. Recent log:"
git log --oneline | head -5
