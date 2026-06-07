#!/usr/bin/env node
/**
 * P006B — cli:seed-instance (HTTP-backed)
 *
 * Explicit operator action: run every registered connector once and persist
 * its initial output. Replaces the runtime `ensureSeededMockData()` path
 * that fired on every dashboard page render.
 *
 * Why HTTP-backed: an earlier TypeScript version of this CLI tried to
 * import lib/platform directly via tsx, but the module chain pulls in
 * 'server-only' (a Next.js compile-time marker) from multiple workspaces.
 * Running the same logic via the existing /api/connectors/sync endpoint
 * sidesteps the resolution problem and reuses the tested HTTP path. The
 * operator workflow becomes:
 *
 *   1. Start the dev server (`corepack pnpm dev`)
 *   2. Run this CLI from another terminal
 *
 * That's the same constraint as cli:register-project — explicit human steps
 * tied to a running platform.
 *
 * Doctrine (D023 + D048): runtime page renders must be pure reads. Seeding
 * is a deliberate human step. Per Chief Architect 2026-06-06, skipped
 * connectors must surface explicitly, not silently roll into success.
 *
 * Usage:
 *   pnpm cli:seed-instance                        # seed every registered connector
 *   pnpm cli:seed-instance --connector foo        # seed just one
 *   pnpm cli:seed-instance --url http://other     # override dashboard URL
 *
 * Exit codes:
 *   0  every connector returned status='ok'
 *   1  at least one connector returned status='error' or status='skipped'
 *   2  the dashboard could not be reached
 */

function parseArgs(argv) {
  let connector = null;
  let url = process.env.AI_COMPANY_DASHBOARD_URL || 'http://localhost:3000';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--connector') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        console.error('✗ --connector requires a value');
        process.exit(1);
      }
      connector = next;
      i++;
    } else if (a === '--url') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        console.error('✗ --url requires a value');
        process.exit(1);
      }
      url = next;
      i++;
    }
  }
  return { connector, url };
}

async function main() {
  const { connector, url } = parseArgs(process.argv.slice(2));
  const body = connector ? { connectors: [connector] } : {};

  console.log(`POST ${url}/api/connectors/sync`);
  console.log(`body: ${JSON.stringify(body)}`);

  let res;
  try {
    res = await fetch(`${url}/api/connectors/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(
      `✗ could not reach the dashboard at ${url} — is it running? (\`corepack pnpm dev\`)`,
    );
    console.error(`  ${err && err.message ? err.message : err}`);
    return 2;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`✗ sync failed: HTTP ${res.status}`);
    if (text) console.error(`  body: ${text}`);
    return 1;
  }

  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];

  let okCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log(`seeded ${results.length} connector${results.length === 1 ? '' : 's'}:`);
  for (const r of results) {
    if (r.status === 'ok') okCount++;
    else if (r.status === 'skipped') skippedCount++;
    else if (r.status === 'error') errorCount++;

    const tag =
      r.status === 'ok'
        ? '✓ ok'
        : r.status === 'skipped'
          ? `⚠ skipped: ${r.skipReason ?? 'unknown'}`
          : `✗ error: ${r.error ?? 'unknown'}`;
    const counts = `metrics=${r.metricsRecorded ?? 0} risks=${r.risksRecorded ?? 0} opps=${r.opportunitiesRecorded ?? 0} (${r.durationMs ?? 0}ms)`;
    console.log(`  ${tag} — ${r.name} → ${r.projectSlug} — ${counts}`);
  }

  console.log(
    `\nsummary: ok=${okCount} skipped=${skippedCount} error=${errorCount} total=${results.length}`,
  );

  if (errorCount > 0) {
    console.error('✗ one or more connectors errored — fix and re-run');
    return 1;
  }
  if (skippedCount > 0) {
    console.error(
      '⚠ one or more connectors skipped — register the missing project(s) via cli:register-project and re-run',
    );
    return 1;
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error('✗ seed-instance failed:', err);
    process.exit(1);
  },
);
