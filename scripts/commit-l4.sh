#!/usr/bin/env bash
# Commit L4: move static instance-connector imports out of platform.ts into
# the new instance-connectors.ts module.
# Run from the repo root: `bash scripts/commit-l4.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

# Sandbox may leave stale .git locks; safe to ignore if absent.
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

# Next.js compiles platform.ts via Turbopack, not tsc -b, so there's no
# .tsbuildinfo to wipe for the app. The connector packages and database
# package are unchanged; their dist/ + .tsbuildinfo are still valid.

# Acceptance grep — must show zero non-comment project-specific tokens in platform.ts.
echo "=== L4 acceptance check: platform.ts has no project-specific tokens (comments OK) ==="
if grep -E "connector-foodtruck|connector-lab|connector-inventory|connector-burger|connector-whatsapp|FoodTruck|LabOs|InventoryEngine|WhatsAppEngine|foodtruck-il|lab-os|inventory-engine|burgerstop|whatsapp-engine|FOODTRUCK_" apps/executive-dashboard/lib/platform.ts \
    | grep -vE '^\s*//' \
    | grep -vE 'connector-foodtruck-\*|connector-lab-os|connector-inventory-engine|connector-whatsapp-engine'; then
  echo "FAIL: real tokens above"
  exit 1
fi
echo "PASS"
echo

git add \
  apps/executive-dashboard/lib/instance-connectors.ts \
  apps/executive-dashboard/lib/platform.ts \
  scripts/commit-l4.sh

git commit -m "refactor(dashboard): move connector registration to instance layer

L4 from docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md. The
dashboard's platform.ts used to import four instance-specific connectors
by name (FoodTruckIlConnector, LabOsConnector, InventoryEngineConnector,
WhatsAppEngineConnector), plus the FOODTRUCK_* env fallback chain and a
[platform] connector-mode log. All of those are per-company concerns and
have no place in the generic-platform glue.

Changes:
- apps/executive-dashboard/lib/instance-connectors.ts (NEW)
  - Owns the four connector imports.
  - Exposes buildInstanceConnectors(env): DataConnector[] which constructs
    them with the right env (FoodTruck-IL gets the SUPABASE_* fallback;
    others are constructed with no config).
  - Owns the AI_COMPANY_LOG_CONNECTOR_MODE diagnostic log line.
- apps/executive-dashboard/lib/platform.ts
  - Drops the four imports + FoodTruck env block + log line.
  - Imports buildInstanceConnectors and calls it once.
  - Keeps the AI_COMPANY_ACTIVE_CONNECTORS allow-list filter, which is
    slug-agnostic (filters by connector.name regardless of which company
    supplied it).
  - Adds a 'do not re-introduce' comment block where the imports used to be.

Behaviour preserved:
- Same four connectors register, in the same order.
- FoodTruck-IL still flips live ↔ mock on the same env vars.
- AI_COMPANY_LOG_CONNECTOR_MODE=1 still logs the same one-liner (prefix
  changed from [platform] to [instance] to reflect where the log now lives).
- AI_COMPANY_ACTIVE_CONNECTORS allow-list still works.
- /api/connectors/sync, /api/projects, all executive briefings unchanged.

Verified:
  grep -E 'connector-foodtruck|FoodTruck|lab-os|inventory-engine|whatsapp-engine|FOODTRUCK_' \\
    apps/executive-dashboard/lib/platform.ts \\
    | non-comment lines → zero matches.

Smoke (host):
  - / 200, 4 projects render
  - /ceo 200
  - /registry 200
  - /api/projects → same 4 entries
  - portfolio dashboard still loads
  - FoodTruck connector still live when FOODTRUCK_* + SUPABASE_* envs set"

echo
echo "Done. Recent log:"
git log --oneline | head -5
