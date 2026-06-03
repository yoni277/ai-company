#!/usr/bin/env bash
# Commit the L1 refactor: remove instance-connector import from ai-chief-of-staff.
# Run from the repo root: `bash scripts/commit-l1.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

# Sandbox sometimes leaves stale .git locks; safe to ignore if not present.
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

# Stale build artefacts from earlier `tsc -b` runs make incremental rebuilds skip
# emit when sources change unexpectedly. Wipe both dist/ AND the
# tsconfig.tsbuildinfo so the next `pnpm -r typecheck` / `pnpm -r build` is forced
# to re-emit. Without removing tsconfig.tsbuildinfo, `tsc -b` will look at the
# project graph it remembered last time and skip writing index.d.ts, which then
# causes downstream typecheck failures.
rm -rf packages/ai-chief-of-staff/dist 2>/dev/null || true
rm -f packages/ai-chief-of-staff/tsconfig.tsbuildinfo 2>/dev/null || true

# shared-types is the source of new exports (AcquisitionSummary) — same drift
# applies. Cleaning it ensures DailyBriefMetricsInput.acquisitionSummary is
# present in dist/phase2.d.ts after the next build.
rm -rf packages/shared-types/dist 2>/dev/null || true
rm -f packages/shared-types/tsconfig.tsbuildinfo 2>/dev/null || true

git add \
  packages/shared-types/src/phase2.ts \
  packages/ai-chief-of-staff/src/daily-brief.ts \
  packages/ai-chief-of-staff/package.json \
  apps/executive-dashboard/lib/owner-acquisition.ts \
  apps/executive-dashboard/lib/phase2-metrics.ts \
  apps/executive-dashboard/app/page.tsx

git commit -m "refactor(chief-of-staff): remove instance connector dependency

L1 from docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md. The
Chief of Staff is part of the generic platform layer and must not depend
on any instance-specific connector (foodtruck-business, lab-os, etc.).

Before: daily-brief.ts imported buildOwnerAcquisitionSummary from
@ai-company/connector-foodtruck-business and read m.foodTruck directly.
That hard-coupled the most-generic executive to one company's portfolio.

After: a new AcquisitionSummary shared type carries the pre-computed
promptLine + fallbackSummary strings. The instance layer
(apps/executive-dashboard/lib/owner-acquisition.ts) computes both from
the FoodTruck connector and passes them in via
DailyBriefMetricsInput.acquisitionSummary. The Chief of Staff renders the
strings without knowing what business produced them.

Changes:
- packages/shared-types/src/phase2.ts: add AcquisitionSummary type;
  add DailyBriefMetricsInput.acquisitionSummary; mark .foodTruck deprecated.
- packages/ai-chief-of-staff/src/daily-brief.ts: remove the import;
  ownerAcquisitionPromptLine + ownerSummaryFromInput now read only from
  m.acquisitionSummary. Inline comment forbids re-introducing the import.
- packages/ai-chief-of-staff/package.json: drop connector-foodtruck-business
  workspace dep.
- apps/executive-dashboard/lib/owner-acquisition.ts: also return
  acquisitionSummary: { promptLine, fallbackSummary }.
- apps/executive-dashboard/{lib/phase2-metrics.ts,app/page.tsx}: pass
  acquisitionSummary alongside the existing foodTruck field (kept for the
  rest of the dashboard panels during this phased refactor).

No behavior change. Same strings reach the LLM prompt and the
deterministic fallback. Same JSON shape emitted to /api/chief-of-staff/daily-brief.

Acceptance verified:
  grep -rE 'connector-(foodtruck|lab-os|burgerstop|inventory-engine)' \\
    packages/ai-chief-of-staff/src/ → only the no-reintroduce comment.
  grep -rnE 'm\.foodTruck' packages/ai-chief-of-staff/src/ → zero matches.
  grep -E '\"@ai-company/connector-' packages/ai-chief-of-staff/package.json → zero matches."

echo
echo "Done. Recent log:"
git log --oneline | head -5
