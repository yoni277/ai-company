#!/usr/bin/env node
/**
 * Phase 2 connector validation runner. Loads .env.local from repo root.
 * Prints JSON results only — no secrets.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');

function loadEnvLocal() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const results = {
  timestamp: new Date().toISOString(),
  github: { configured: false, live: false, metrics: null, error: null, errorHandling: null },
  supabase: { configured: false, live: false, metrics: null, error: null, errorHandling: null },
};

// GitHub
const ghToken = process.env.GITHUB_TOKEN ?? '';
const ghRepo = process.env.GITHUB_REPOSITORY ?? '';
results.github.configured = Boolean(ghToken && ghRepo);
if (results.github.configured) {
  try {
    const { GithubConnector } = await import('../packages/connectors/github/src/index.ts');
    const conn = new GithubConnector({ token: ghToken, repository: ghRepo });
    results.github.live = conn.live;
    results.github.metrics = await conn.fetchMetrics();
  } catch (e) {
    results.github.error = e instanceof Error ? e.message : String(e);
  }
  try {
    const { GithubConnector } = await import('../packages/connectors/github/src/index.ts');
    const bad = new GithubConnector({ token: 'invalid', repository: ghRepo });
    await bad.fetchMetrics();
    results.github.errorHandling = 'expected failure but succeeded';
  } catch (e) {
    results.github.errorHandling = e instanceof Error ? e.message : String(e);
  }
} else {
  const { githubConnectorFromEnv } = await import('../packages/connectors/github/src/index.ts');
  const mock = githubConnectorFromEnv();
  results.github.live = mock.live;
  results.github.metrics = await mock.fetchMetrics();
  results.github.error = 'GITHUB_TOKEN or GITHUB_REPOSITORY not set — mock fallback used';
}

// Supabase
const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const sbSchema = process.env.SUPABASE_SCHEMA ?? 'ai_company';
results.supabase.configured = Boolean(sbUrl && sbKey);
if (results.supabase.configured) {
  try {
    const { SupabasePlatformConnector } = await import(
      '../packages/connectors/supabase/src/index.ts'
    );
    const conn = new SupabasePlatformConnector({
      supabaseUrl: sbUrl,
      serviceRoleKey: sbKey,
      schema: sbSchema,
    });
    results.supabase.live = conn.live;
    results.supabase.metrics = await conn.fetchMetrics();
  } catch (e) {
    results.supabase.error = e instanceof Error ? e.message : String(e);
  }
  try {
    const { SupabasePlatformConnector } = await import(
      '../packages/connectors/supabase/src/index.ts'
    );
    const bad = new SupabasePlatformConnector({
      supabaseUrl: sbUrl,
      serviceRoleKey: 'invalid-key',
      schema: sbSchema,
    });
    await bad.fetchMetrics();
    results.supabase.errorHandling = 'expected failure but succeeded';
  } catch (e) {
    results.supabase.errorHandling = e instanceof Error ? e.message : String(e);
  }
} else {
  const { supabasePlatformConnectorFromEnv } = await import(
    '../packages/connectors/supabase/src/index.ts'
  );
  const mock = supabasePlatformConnectorFromEnv();
  results.supabase.live = mock.live;
  results.supabase.metrics = await mock.fetchMetrics();
  results.supabase.error = 'Supabase URL or service role key not set — mock fallback used';
}

console.log(JSON.stringify(results, null, 2));
