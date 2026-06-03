import type { Repositories } from './repositories';
import { InMemoryRepositories } from './in-memory-repositories';
import { createSupabaseRepositories } from './supabase-repositories';

export type DataMode = 'mock' | 'supabase';

export interface PlatformEnv {
  dataMode: DataMode;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  /** PostgREST schema. Defaults to `ai_company`. Override with SUPABASE_SCHEMA. */
  supabaseSchema?: string;
}

/**
 * Build the repository layer based on env.
 *
 * - `mock`: in-memory store seeded with the four Phase 1 projects. Zero infra.
 * - `supabase`: real Supabase, requires url + service-role key.
 */
export function createRepositories(env: PlatformEnv): Repositories {
  if (env.dataMode === 'supabase') {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      throw new Error(
        'createRepositories: supabase mode requires supabaseUrl and supabaseServiceRoleKey',
      );
    }
    return createSupabaseRepositories({
      url: env.supabaseUrl,
      serviceRoleKey: env.supabaseServiceRoleKey,
      ...(env.supabaseSchema ? { schema: env.supabaseSchema } : {}),
    });
  }
  return new InMemoryRepositories();
}

export function envFromProcessEnv(): PlatformEnv {
  const mode = (process.env.AI_COMPANY_DATA_MODE ?? 'mock') as DataMode;
  return {
    dataMode: mode,
    ...(process.env.NEXT_PUBLIC_SUPABASE_URL
      ? { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL }
      : {}),
    ...(process.env.SUPABASE_SERVICE_ROLE_KEY
      ? { supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY }
      : {}),
    ...(process.env.SUPABASE_SCHEMA ? { supabaseSchema: process.env.SUPABASE_SCHEMA } : {}),
  };
}
