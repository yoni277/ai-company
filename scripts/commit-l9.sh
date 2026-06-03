#!/usr/bin/env bash
# Commit L9: move instance-owned files out of the dashboard app into
# instances/yoni-company/. Dashboard imports via the @active-instance/* alias.
# Run from the repo root: `bash scripts/commit-l9.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

# No dist/.tsbuildinfo wipe needed:
#   - apps/executive-dashboard uses Next/Turbopack, not tsc -b.
#   - The two moved files are part of the dashboard's TS compilation graph.

echo "=== L9 acceptance check 1: instance files removed from dashboard lib/ ==="
if ls apps/executive-dashboard/lib/ | grep -E "^instance-" >/dev/null 2>&1; then
  echo "FAIL: instance-*.ts still present in apps/executive-dashboard/lib/"
  exit 1
fi
echo "PASS"

echo
echo "=== L9 acceptance check 2: instance files relocated to instances/yoni-company/ ==="
if [ ! -f instances/yoni-company/instance-connectors.ts ] || [ ! -f instances/yoni-company/instance-seed.ts ]; then
  echo "FAIL: expected files missing under instances/yoni-company/"
  exit 1
fi
echo "PASS"

echo
echo "=== L9 acceptance check 3: dashboard imports use @active-instance/* alias ==="
if ! grep -q "from '@active-instance/" apps/executive-dashboard/lib/platform.ts; then
  echo "FAIL: platform.ts is not importing via @active-instance/*"
  exit 1
fi
echo "PASS"

git add -A apps/executive-dashboard/lib instances apps/executive-dashboard/tsconfig.json scripts/commit-l9.sh

git commit -m "refactor(instance): move company-specific config outside dashboard app

L9 from docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md.

instance-connectors.ts and instance-seed.ts described 'which projects this
company has' and 'which connectors run for this company'. They lived under
apps/executive-dashboard/lib/, mixing instance config into the generic
dashboard app. Now they live under instances/yoni-company/ — clearly
labeled as instance-owned, and importable by the dashboard via the
neutral path alias '@active-instance/*'.

Layout:

  instances/
  └── yoni-company/
      ├── README.md
      ├── instance-connectors.ts   (moved from apps/.../lib/)
      └── instance-seed.ts         (moved from apps/.../lib/)

Import strategy:
  apps/executive-dashboard/tsconfig.json:
    'paths.@active-instance/*' → '../../instances/yoni-company/*'

To clone for another company (e.g. AcmeCo):
  1. Copy instances/yoni-company/ to instances/acme/.
  2. Edit instance-seed.ts + instance-connectors.ts inside instances/acme/.
  3. Flip the alias in apps/executive-dashboard/tsconfig.json:
       '@active-instance/*': ['../../instances/acme/*']
  4. Reinstall / rebuild. Platform layer is untouched.

Changes:
- apps/executive-dashboard/lib/instance-connectors.ts → instances/yoni-company/
- apps/executive-dashboard/lib/instance-seed.ts        → instances/yoni-company/
- apps/executive-dashboard/lib/platform.ts: imports rewritten to
  '@active-instance/instance-seed' and '@active-instance/instance-connectors'.
- apps/executive-dashboard/tsconfig.json: adds the @active-instance/*
  path alias and includes the instances dir in the TS compilation graph.
- instances/yoni-company/README.md (NEW): documents the instance boundary.

Constraints honoured:
- No connector dependencies removed from apps/executive-dashboard/package.json
  (that's L5).
- No new features.
- No runtime behaviour change. Same 4 connectors register in the same order;
  same INSTANCE_PROJECTS_SEED feeds the in-memory store.

Verified:
- No 'instance-*.ts' files remain in apps/executive-dashboard/lib/.
- Files exist at instances/yoni-company/instance-{connectors,seed}.ts.
- grep 'from .@active-instance/' apps/executive-dashboard/lib/platform.ts → 2 matches.
- No relative './instance-(connectors|seed)' imports remain in apps/."

echo
echo "Done. Recent log:"
git log --oneline | head -5
