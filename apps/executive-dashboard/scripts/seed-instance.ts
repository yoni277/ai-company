/**
 * P006B — Deprecated stub.
 *
 * The TypeScript version of cli:seed-instance was retired 2026-06-06 after
 * the import chain pulled in 'server-only' from multiple workspaces (Next
 * compile-time marker) and broke standalone tsx execution.
 *
 * The replacement is plain Node ESM that talks to the running dashboard via
 * its /api/connectors/sync endpoint:
 *
 *   scripts/seed-instance.mjs    (workspace root)
 *
 * Both `pnpm cli:seed-instance` (root) and
 * `pnpm -C apps/executive-dashboard cli:seed-instance` route through the
 * .mjs version.
 */
console.error(
  '✗ seed-instance.ts is deprecated. Use `corepack pnpm cli:seed-instance` (HTTP-backed mjs script).',
);
process.exit(1);
