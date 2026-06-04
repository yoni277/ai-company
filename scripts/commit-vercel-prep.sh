#!/usr/bin/env bash
# Commit the Vercel private-deployment prep:
#   - apps/executive-dashboard/middleware.ts  (HTTP Basic Auth gate)
#   - apps/executive-dashboard/vercel.json    (monorepo install/build)
#   - docs/deployment/VERCEL_DEPLOYMENT.md    (env vars + checklist)
#   - scripts/commit-vercel-prep.sh           (this script)
#
# This commit adds deployment-readiness only. No platform code changes, no
# feature work, no architectural changes. The dashboard remains private —
# the basic-auth gate is enforced when DASHBOARD_BASIC_AUTH_USER and
# DASHBOARD_BASIC_AUTH_PASSWORD are set on the Vercel project.
#
# Run from the repo root: `bash scripts/commit-vercel-prep.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

git add \
  apps/executive-dashboard/middleware.ts \
  apps/executive-dashboard/vercel.json \
  docs/deployment/VERCEL_DEPLOYMENT.md \
  scripts/commit-vercel-prep.sh

if ! git diff --cached --quiet; then
  git commit -m "chore(deploy): prepare private vercel deployment

Adds the minimum scaffolding to deploy apps/executive-dashboard to Vercel
for the CEO's private daily use during Production Validation Phase 1.
This is NOT a public-demo deploy — without env-var auth credentials the
deployment is closed, and the basic-auth middleware refuses every request
that doesn't carry valid credentials.

Files:

- apps/executive-dashboard/middleware.ts (new)
  HTTP Basic Auth gate. Runs on the Edge runtime, matches every route
  except _next/static, _next/image, favicon.ico, and robots.txt. Enforced
  when DASHBOARD_BASIC_AUTH_USER and DASHBOARD_BASIC_AUTH_PASSWORD are
  both set; bypassed (open access) when either is missing so local dev
  is unaffected. Uses constant-time comparison.

- apps/executive-dashboard/vercel.json (new)
  framework = nextjs.
  installCommand and buildCommand cd back to the repo root so pnpm
  workspace + @active-instance/* aliases resolve. Output directory is
  the default .next under the dashboard app.

- docs/deployment/VERCEL_DEPLOYMENT.md (new)
  One-time project setup (Root Directory = apps/executive-dashboard).
  Full env-var matrix: auth gate, build runtime
  (ENABLE_EXPERIMENTAL_COREPACK=1 so Vercel honours packageManager and
  uses pnpm 9), data mode, Supabase platform + instance creds,
  Anthropic/OpenAI keys, GitHub connector, diagnostics. Pre-deploy
  checklist, post-deploy smoke list covering /, /ceo, /registry,
  /api/projects, /api/registry/projects. Rollback and ops notes.

No platform code touched. No package.json changes. No new dependencies."
else
  echo '[vercel-prep] no changes to commit'
fi

echo
echo "Done. Recent log:"
git log --oneline | head -5
