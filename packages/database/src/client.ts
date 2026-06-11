import type { Repositories } from './repositories';
import { InMemoryRepositories, type InMemorySeedProject } from './in-memory-repositories';
import { createSupabaseRepositories } from './supabase-repositories';

export type DataMode = 'mock' | 'supabase';

export interface PlatformEnv {
  dataMode: DataMode;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  /**
   * SEC-1 (S5) — scoped-role key (a JWT whose `role` claim = 'ai_company_app').
   * Preferred over the service-role key so app traffic runs under a least-
   * privilege role to which RLS APPLIES (service-role bypasses RLS). When set,
   * it is used for all repository traffic; otherwise we fall back to the
   * service-role key with a loud warning. Override with SUPABASE_SCOPED_KEY.
   */
  supabaseScopedKey?: string;
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
    // SEC-1 (S5): prefer the scoped-role key; the service-role key is the
    // transition fallback until the scoped JWT is provisioned. At least one is
    // required.
    const dataKey = env.supabaseScopedKey ?? env.supabaseServiceRoleKey;
    if (!env.supabaseUrl || !dataKey) {
      throw new Error(
        'createRepositories: supabase mode requires supabaseUrl and a key (SUPABASE_SCOPED_KEY or SUPABASE_SERVICE_ROLE_KEY)',
      );
    }
    if (!env.supabaseScopedKey) {
      // eslint-disable-next-line no-console
      console.warn(
        'SEC-1/S5: SUPABASE_SCOPED_KEY is not set — repository traffic is using the ' +
          'god-mode service-role key (RLS bypassed). Provision the scoped-role JWT and set ' +
          'SUPABASE_SCOPED_KEY to run under least privilege.',
      );
    }
    return createSupabaseRepositories({
      url: env.supabaseUrl,
      serviceRoleKey: dataKey,
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
    ...(process.env.SUPABASE_SCOPED_KEY
      ? { supabaseScopedKey: process.env.SUPABASE_SCOPED_KEY }
      : {}),
    ...(process.env.SUPABASE_SCHEMA ? { supabaseSchema: process.env.SUPABASE_SCHEMA } : {}),
  };
}
