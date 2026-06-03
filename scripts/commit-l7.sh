#!/usr/bin/env bash
# Commit L7: split supabase/migrations into platform/ and instance/.
# Run from the repo root: `bash scripts/commit-l7.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

# Sandbox may leave stale .git locks; safe to ignore if absent.
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

# `git mv` is the right move so git records a rename not a delete+add.
# These were already physically moved on disk during L7; re-stage them as renames.
# If your working tree has them as untracked+deleted, run `git add -A supabase/migrations`
# instead — git will detect the renames by content hash.

git add -A supabase/migrations

git commit -m "refactor(db): split platform and instance migrations

L7 from docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md.
Separates reusable database schema from this specific company's seed
and config data so the platform can be duplicated for a new instance
(e.g. AcmeCo) without touching schema files.

Layout:

  supabase/migrations/
  ├── platform/   ← reusable schema; ships with the platform
  │   ├── 0001_init.sql
  │   ├── 0003_init_ai_company_schema.sql
  │   ├── 0005_project_registry.sql
  │   ├── 0007_revenue_ledger.sql
  │   └── 0009_ceo_operating_system.sql
  └── instance/   ← seed/config for this company's portfolio
      ├── 0002_seed.sql
      ├── 0004_seed_ai_company_schema.sql
      ├── 0006_seed_project_registry.sql
      └── 0008_seed_revenue_connectors.sql

Verified before the move:
- grep -iE '^insert|foodtruck|lab-os|burgerstop|inventory-engine|whatsapp-engine'
  on every platform file → zero matches.
- grep -iE '^create table|^create type'
  on every instance file → zero matches.

No file contents changed. No TypeScript changed. No application code
changed. No production database touched. The migrations were not
re-applied. supabase/migrations/README.md documents the boundary,
apply order, and AcmeCo clone procedure.

Known stale reference (not addressed in this commit per the L7 constraint
of zero TS changes):

  packages/project-registry/src/seed-data.ts:3
  comment references 'supabase/migrations/0006_seed_project_registry.sql'
  which now lives at 'supabase/migrations/instance/0006_seed_project_registry.sql'.

That comment update belongs in a follow-up touching L8 (project-registry
seed move out of the platform package)."

echo
echo "Done. Recent log:"
git log --oneline | head -5
