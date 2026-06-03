#!/usr/bin/env bash
# L2 + L3 — Move vendor and marketing-channel hints from the platform
# executives into the instance metadata layer.
#
# Before:
#   - packages/ai-coo/src/fake-llm-client.ts owned PROJECT_VENDORS, a
#     slug-keyed map of FoodTruck-IL → Wolt, lab-os → LIMS,
#     whatsapp-engine → Meta WhatsApp Cloud API, etc.
#   - packages/ai-vp-marketing/src/fake-llm-client.ts owned
#     PROJECT_CHANNEL_HINTS, a slug-keyed map of foodtruck-il → whatsapp,
#     lab-os → email, etc.
#   Cloning the platform for a different company meant editing both Fake
#   LLM clients to swap in the new company's vendors and channels.
#
# After:
#   - packages/shared-types exports `ProjectExecutiveMetadata`
#     (vendors / marketingChannels / salesChannels / marketContext).
#   - packages/ai-chief-of-staff/context.ts exposes
#     `registerInstanceProjectMetadata(provider)`. `buildCompanyContext`
#     attaches the per-project metadata returned by the provider onto each
#     `CompanyContext.projects[i].metadata`.
#   - packages/ai-coo and packages/ai-vp-marketing read vendors / channels
#     from that metadata. Missing metadata → neutral output (empty
#     vendorHealth row set, 'product' default channel). Nothing is inferred
#     from project slug or name.
#   - instances/yoni-company/project-executive-metadata.ts (new) owns the
#     Yoni-specific vendor and channel data, keyed by slug.
#   - apps/executive-dashboard/lib/platform.ts registers the provider at
#     module-load time, before any executive runs.
#
# Run from the repo root: `bash scripts/commit-l2-l3.sh`
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true

# Wipe stale tsbuildinfo so tsc -b picks up the new exports.
rm -f \
  packages/shared-types/tsconfig.tsbuildinfo \
  packages/shared-types/dist/*.tsbuildinfo \
  packages/ai-chief-of-staff/tsconfig.tsbuildinfo \
  packages/ai-chief-of-staff/dist/*.tsbuildinfo \
  packages/ai-coo/tsconfig.tsbuildinfo \
  packages/ai-coo/dist/*.tsbuildinfo \
  packages/ai-vp-marketing/tsconfig.tsbuildinfo \
  packages/ai-vp-marketing/dist/*.tsbuildinfo \
  2>/dev/null || true

git add \
  packages/shared-types/src/executive.ts \
  packages/ai-chief-of-staff/src/context.ts \
  packages/ai-coo/src/fake-llm-client.ts \
  packages/ai-vp-marketing/src/fake-llm-client.ts \
  instances/yoni-company/project-executive-metadata.ts \
  apps/executive-dashboard/lib/platform.ts \
  apps/executive-dashboard/tsconfig.json \
  apps/executive-dashboard/next.config.mjs \
  scripts/commit-l2-l3.sh

if ! git diff --cached --quiet; then
  git commit -m "refactor(executives): move vendor and channel hints to instance metadata

L2 + L3 of the generic-platform refactor. The COO and VP Marketing Fake
LLM clients no longer hardcode slug-keyed vendor and channel maps. They
read those hints from instance-supplied per-project metadata.

Platform changes (no project-specific data left):

- packages/shared-types/src/executive.ts
  Adds \`ProjectExecutiveMetadata\` interface (vendors with optional
  metricHint, marketingChannels, salesChannels, marketContext) and
  attaches optional \`metadata\` to each \`CompanyContext.projects[i]\`.

- packages/ai-chief-of-staff/src/context.ts
  Adds \`registerInstanceProjectMetadata(provider)\` and
  \`__resetInstanceProjectMetadata()\`. \`buildCompanyContext\` calls the
  registered provider per project and attaches its result onto each
  per-project entry. No provider → metadata is undefined; executives
  default to neutral output.

- packages/ai-coo/src/fake-llm-client.ts
  Drops the \`PROJECT_VENDORS\` slug-keyed map. Reads vendors from
  \`p.metadata?.vendors\`. Each vendor's \`metricHint\` is now a regex
  source string (string instead of RegExp object), compiled with a
  safe-regex helper so a bad pattern degrades gracefully. Existing
  metric-name heuristics (OPS_PATTERNS, looksOps) are unchanged.

- packages/ai-vp-marketing/src/fake-llm-client.ts
  Drops the \`PROJECT_CHANNEL_HINTS\` slug-keyed map. \`defaultChannel()\`
  now takes the project entry and reads
  \`metadata?.marketingChannels?.[0] ?? 'product'\`. Existing metric-name
  heuristics (stageFor, isGrowthSignal) are unchanged.

Instance layer:

- instances/yoni-company/project-executive-metadata.ts (new)
  Owns the slug-keyed metadata that used to live in the two Fake LLM
  clients: foodtruck-il / lab-os / inventory-engine / whatsapp-engine
  vendors and marketingChannels. Missing slugs (e.g. burgerstop) return
  undefined and executives produce neutral output.

- apps/executive-dashboard/lib/platform.ts
  Imports \`getInstanceProjectMetadata\` from
  @active-instance/project-executive-metadata and calls
  \`registerInstanceProjectMetadata(getInstanceProjectMetadata)\` at
  module-load time, alongside the existing project-registry-seed
  registration from L8.

- apps/executive-dashboard/tsconfig.json
  Adds explicit \`@active-instance/project-executive-metadata\` path
  mapping next to the existing instance-seed / instance-connectors /
  project-registry-seed entries.

- apps/executive-dashboard/next.config.mjs
  Adds matching Turbopack \`resolveAlias\` entry. Same pattern as L8/L9.

Behaviour preserved for the Yoni instance:
- COO: same four projects (foodtruck-il, lab-os, inventory-engine,
  whatsapp-engine) still surface the same vendor names in vendorHealth
  with the same status logic. metricHint regex tests use the same
  patterns (now compiled from string sources).
- VP Marketing: same default channels per project (whatsapp / email /
  partnership / whatsapp respectively). Campaign rationales include
  the same channel string. Funnel-stage and growth-signal classifiers
  are byte-identical to before.
- A project with no registered metadata (e.g. burgerstop) contributes
  no vendorHealth rows and falls back to the 'product' marketing
  channel — the new neutral-default behaviour required by the
  generic-platform rule."
else
  echo '[l2-l3] no changes to commit'
fi

echo
echo "Done. Recent log:"
git log --oneline | head -5
