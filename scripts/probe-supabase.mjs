#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    process.env[t.slice(0, i).trim()] ??= t.slice(i + 1).trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const schema = process.env.SUPABASE_SCHEMA ?? 'ai_company';

async function probe(label, schemaName) {
  const client = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: schemaName },
  });
  const out = { schema: schemaName, tables: {} };
  for (const table of ['projects', 'risks', 'project_metrics', 'executive_reports']) {
    const r = await client.from(table).select('id', { count: 'exact', head: true });
    out.tables[table] = r.error
      ? { error: r.error.message, code: r.error.code }
      : { count: r.count ?? 0 };
  }
  const ping = await client.from('projects').select('id').limit(1);
  out.pingOk = !ping.error;
  out.pingError = ping.error?.message ?? null;
  return out;
}

const results = {
  projectHost: url ? new URL(url).hostname : null,
  schema,
  ai_company: await probe('ai_company', 'ai_company'),
  public: await probe('public', 'public'),
};

console.log(JSON.stringify(results, null, 2));
