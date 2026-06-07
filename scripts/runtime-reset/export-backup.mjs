#!/usr/bin/env node
/**
 * Runtime-state file export — dumps every ai_company runtime table to
 * docs/archive/runtime-reset-<date>/<table>.json for an on-disk backup.
 *
 * The authoritative backup for the 2026-06-06 reset is the in-database
 * snapshot schema `ai_company_backup_20260606`. This script produces the
 * equivalent on-disk copy and is provided so the export is reproducible
 * from any machine that can reach Supabase (the agent sandbox could not).
 *
 * Usage:
 *   node scripts/runtime-reset/export-backup.mjs            # uses today's date
 *   node scripts/runtime-reset/export-backup.mjs 2026-06-06 # explicit date
 */
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
loadEnv({ path: resolve(__dirname, '..', '..', '.env.local') });

const TABLES = [
  'projects', 'project_definitions', 'project_funnel_stages',
  'project_connector_configs', 'data_sources', 'project_metrics',
  'risks', 'opportunities', 'ceo_directives', 'directive_responses',
  'executive_reports', 'report_links', 'task_proposals', 'tasks',
  'evidence_tokens', 'task_outcomes', 'objectives', 'objective_outcomes',
  'ceo_decisions', 'revenue_transactions',
];

const date = process.argv[2] || new Date().toISOString().slice(0, 10);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const client = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: 'ai_company' },
});

const outDir = resolve(__dirname, '..', '..', 'docs', 'archive', `runtime-reset-${date}`);
mkdirSync(outDir, { recursive: true });

const counts = {};
for (const table of TABLES) {
  const { data, error } = await client.from(table).select('*');
  if (error) {
    console.error(`✗ ${table}: ${error.message}`);
    process.exit(1);
  }
  counts[table] = data.length;
  writeFileSync(resolve(outDir, `${table}.json`), JSON.stringify(data, null, 2));
  console.log(`✓ ${table}: ${data.length} rows`);
}
writeFileSync(resolve(outDir, 'counts.json'), JSON.stringify({ date, counts }, null, 2));
console.log(`\n✓ export complete → ${outDir}`);
