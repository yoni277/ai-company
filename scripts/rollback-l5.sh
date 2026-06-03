#!/usr/bin/env bash
# Rollback L5 if validation fails (typecheck or build can't resolve the four
# instance connectors after they were removed from the dashboard package.json).
#
# Restores the four dependency lines to apps/executive-dashboard/package.json
# and reinstalls.
#
# Run from the repo root: `bash scripts/rollback-l5.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

# Use a portable in-place sed (BSD/GNU compatible) to add the four lines back
# just before the line that currently has @ai-company/connector-github.
python3 <<'PY'
import re, pathlib, sys
p = pathlib.Path('apps/executive-dashboard/package.json')
src = p.read_text()
already = '"@ai-company/connector-foodtruck-il"' in src
if already:
    print('[rollback-l5] already present — no change')
    sys.exit(0)
marker = '"@ai-company/connector-github": "workspace:*",'
if marker not in src:
    print('[rollback-l5] could not find anchor', file=sys.stderr)
    sys.exit(1)
restored = (
    '"@ai-company/connector-foodtruck-il": "workspace:*",\n'
    '    "@ai-company/connector-lab-os": "workspace:*",\n'
    '    "@ai-company/connector-inventory-engine": "workspace:*",\n'
    '    "@ai-company/connector-whatsapp-engine": "workspace:*",\n'
    '    ' + marker
)
p.write_text(src.replace(marker, restored, 1))
print('[rollback-l5] restored four lines before connector-github')
PY

echo
echo '[rollback-l5] running corepack pnpm install to regenerate lockfile…'
corepack pnpm install
echo
echo '[rollback-l5] done. Re-run typecheck/build to confirm green.'
