import 'server-only';

/**
 * L30 — service-role Supabase client for the CEO-Operability tables
 * (meetings, meeting_type_configs, assigned_work) that don't yet have
 * first-class repos. Mirrors packages/database's client config (schema
 * ai_company). Server-only; never imported into client components.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Meetings require Supabase: set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: process.env.SUPABASE_SCHEMA ?? 'ai_company' },
  }) as unknown as SupabaseClient;
  return cached;
}
