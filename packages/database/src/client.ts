import type { Repositories } from './repositories';
import { InMemoryRepositories, type InMemorySeedProject } from './in-memory-repositories';
import { createSupabaseRepositories } from './supabase-repositories';

export type DataMode = 'mock' | 'supabase';

export interface PlatformEnv {
  dataMode: DataMode;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  /** PostgREST schema. Defaults to `ai_company`. Override with SUPABASE_SCHEMA. */
  supabaseSchema?: string;
  /**
   * Instance-supplied seed for `mock` mode. The platform never hardcodes a
   * portfolio — when an instance wants its mock dashboard pre-populated it
   * passes a `mockSeed` here. See docs/architecture/GENERIC_PLATFORM_BOUNDARY.md
   * leak L6.
   */
  mockSeed?: InMemorySeedProject[];
}

/**
 * Build the repository layer based on env.
 *
 * - `mock`: in-memory store. Empty by default — the instance layer can supply
 *   a `mockSeed` to pre-populate projects (see `PlatformEnv.mockSeed`).
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
  return new InMemoryRepositories(
    env.mockSeed ? { seedProjects: env.mockSeed } : undefined,
  );
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
