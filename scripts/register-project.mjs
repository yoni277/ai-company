#!/usr/bin/env node
/**
 * P006 — cli:register-project
 *
 * Single CLI insert path for project rows. Mirrors POST /api/projects but
 * runs locally against the Supabase project so operators can register
 * without an HTTP round-trip or a running dashboard.
 *
 * Usage:
 *   pnpm cli:register-project \
 *     --slug foodtruck-il \
 *     --name "FoodTruck-IL" \
 *     --status healthy \
 *     [--description "Israeli food truck operations platform."] \
 *     [--createdBy operator]
 *
 * Doctrine: D023 + D038. Same shape as the HTTP endpoint — createdBy is
 * required and must be non-empty. Recommended values:
 *   'ceo' | 'operator' | 'migration' | '<concrete user id>'
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Load .env.local from the repo root and from the dashboard app.
loadEnv({ path: resolve(__dirname, '..', '.env.local') });
loadEnv({ path: resolve(__dirname, '..', 'apps', 'executive-dashboard', '.env.local') });

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function die(msg, code = 1) {
  console.error(`✗ ${msg}`);
  process.exit(code);
}

const VALID_STATUSES = ['healthy', 'at_risk', 'critical', 'paused', 'archived'];

const args = parseArgs(process.argv.slice(2));

const slug = typeof args.slug === 'string' ? args.slug.trim() : '';
const name = typeof args.name === 'string' ? args.name.trim() : '';
const description = typeof args.description === 'string' ? args.description : '';
const status = typeof args.status === 'string' ? args.status : '';
const createdBy = typeof args.createdBy === 'string' ? args.createdBy.trim() : 'operator';

if (!slug) die('--slug is required');
if (!name) die('--name is required');
if (!VALID_STATUSES.includes(status))
  die(`--status must be one of: ${VALID_STATUSES.join(', ')}`);
if (!createdBy) die('--createdBy must be non-empty');

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

if (!url || !key) {
  die(
    'Supabase credentials missing. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local',
  );
}

const client = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: 'ai_company' },
});

const { data: existing, error: lookupErr } = await client
  .from('projects')
  .select('id, slug')
  .eq('slug', slug)
  .maybeSingle();
if (lookupErr) die(`lookup failed: ${lookupErr.message}`);
if (existing) die(`project with slug "${slug}" already exists (id ${existing.id})`, 2);

const { data, error } = await client
  .from('projects')
  .insert({
    slug,
    name,
    description,
    status,
    created_by: createdBy,
  })
  .select('id, slug, name, status, created_by, created_at')
  .single();
if (error) die(`insert failed: ${error.message}`);

console.log('✓ project registered');
console.log(JSON.stringify(data, null, 2));
